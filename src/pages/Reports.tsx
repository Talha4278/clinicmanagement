import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isDemoMode, getDemoInvoices, getDemoPatients } from '../lib/demoData';

interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

interface DoctorStat {
  doctor_name: string;
  total: number;
  count: number;
}

interface OutstandingInvoice {
  invoice_number: string;
  patient_name: string;
  patient_phone: string;
  total: number;
  payment_status: string;
  created_at: string;
}

export default function Reports() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStat[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalPending: 0, totalInvoices: 0, totalPatients: 0 });

  useEffect(() => { fetchReports(); }, [period]);

  async function fetchReports() {
    setLoading(true);

    if (isDemoMode()) {
      const demoInvoices = getDemoInvoices();
      const demoPatients = getDemoPatients();

      const dayMap = new Map<string, { revenue: number; count: number }>();
      demoInvoices.forEach(inv => {
        const d = (inv.created_at || inv.issue_date || '').split('T')[0];
        const existing = dayMap.get(d) ?? { revenue: 0, count: 0 };
        if (inv.payment_status === 'paid') {
          dayMap.set(d, { revenue: existing.revenue + Number(inv.total), count: existing.count + 1 });
        } else {
          dayMap.set(d, { revenue: existing.revenue, count: existing.count + 1 });
        }
      });
      const dailyArr = Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDaily(dailyArr);
      const paidSum = demoInvoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total), 0);
      const pendingSum = demoInvoices.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount || 0)), 0);

      setSummary({
        totalRevenue: paidSum,
        totalPending: pendingSum,
        totalInvoices: demoInvoices.length,
        totalPatients: demoPatients.length,
      });

      setOutstanding(
        demoInvoices.filter(i => i.payment_status !== 'paid').map(inv => ({
          invoice_number: inv.invoice_number,
          patient_name: inv.patient?.name ?? '—',
          patient_phone: inv.patient?.phone ?? '—',
          total: Number(inv.total),
          payment_status: inv.payment_status,
          created_at: inv.created_at,
        }))
      );

      setDoctorStats([
        { doctor_name: 'Dr. Sarah Tariq', total: 106500, count: 2 },
        { doctor_name: 'Dr. Hamza Malik', total: 18000, count: 1 },
      ]);
      setLoading(false);
      return;
    }

    const now = new Date();
    let startDate: Date;
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    const startStr = startDate.toISOString();

    const [paidRes, pendingRes, countRes, patientRes, dailyRes, outstandingRes] = await Promise.all([
      supabase.from('invoices').select('total').gte('created_at', startStr).eq('payment_status', 'paid'),
      supabase.from('invoices').select('total').gte('created_at', startStr).neq('payment_status', 'paid'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', startStr),
      supabase.from('patients').select('id', { count: 'exact', head: true }).gte('created_at', startStr),
      supabase.from('invoices').select('created_at, total, payment_status').gte('created_at', startStr).order('created_at'),
      supabase.from('invoices').select('invoice_number, total, payment_status, created_at, patient:patients(name, phone)').in('payment_status', ['pending', 'partial']).order('created_at', { ascending: false }).limit(20),
    ]);

    // Aggregate daily revenue
    const dayMap = new Map<string, { revenue: number; count: number }>();
    (dailyRes.data ?? []).forEach(inv => {
      const d = inv.created_at.split('T')[0];
      const existing = dayMap.get(d) ?? { revenue: 0, count: 0 };
      if (inv.payment_status === 'paid') {
        dayMap.set(d, { revenue: existing.revenue + Number(inv.total), count: existing.count + 1 });
      } else {
        dayMap.set(d, { revenue: existing.revenue, count: existing.count + 1 });
      }
    });
    const dailyArr = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setDaily(dailyArr);
    setSummary({
      totalRevenue: (paidRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      totalPending: (pendingRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      totalInvoices: countRes.count ?? 0,
      totalPatients: patientRes.count ?? 0,
    });

    // Outstanding
    setOutstanding(
      (outstandingRes.data ?? []).map((inv: any) => ({
        invoice_number: inv.invoice_number,
        patient_name: inv.patient?.name ?? '—',
        patient_phone: inv.patient?.phone ?? '—',
        total: Number(inv.total),
        payment_status: inv.payment_status,
        created_at: inv.created_at,
      }))
    );

    // Doctor stats from invoices in period
    const invWithDoctor = await supabase
      .from('invoices')
      .select('total, payment_status, doctor:staff!invoices_doctor_id_fkey(name)')
      .gte('created_at', startStr)
      .not('doctor_id', 'is', null);

    const doctorMap = new Map<string, { total: number; count: number }>();
    (invWithDoctor.data ?? []).forEach((inv: any) => {
      const name = inv.doctor?.name ?? 'Unknown';
      const existing = doctorMap.get(name) ?? { total: 0, count: 0 };
      doctorMap.set(name, {
        total: existing.total + (inv.payment_status === 'paid' ? Number(inv.total) : 0),
        count: existing.count + 1,
      });
    });
    setDoctorStats(
      Array.from(doctorMap.entries())
        .map(([doctor_name, v]) => ({ doctor_name, ...v }))
        .sort((a, b) => b.total - a.total)
    );

    setLoading(false);
  }

  const maxRevenue = Math.max(...daily.map(d => d.revenue), 1);

  const periodLabels = { week: 'Last 7 days', month: 'This month', year: 'This year' };

  const statusBadge: Record<string, string> = {
    pending: 'badge-pending',
    partial: 'badge-partial',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Financial performance overview</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 card-shadow">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                period === p ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              style={period === p ? { background: '#3c5e27' } : {}}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenue Collected', value: `Rs. ${summary.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#047857', bg: '#ecfdf5' },
          { label: 'Outstanding', value: `Rs. ${summary.totalPending.toLocaleString()}`, icon: TrendingDown, color: '#b45309', bg: '#fffbeb' },
          { label: 'Invoices', value: summary.totalInvoices.toString(), icon: DollarSign, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'New Patients', value: summary.totalPatients.toString(), icon: Users, color: '#6d28d9', bg: '#f5f3ff' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl card-shadow p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <p className="text-xl font-bold text-gray-900">{loading ? '—' : card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{periodLabels[period]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily revenue chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl card-shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Daily Revenue</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#4a7530' }} />
              <span className="text-xs text-gray-500">Paid</span>
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : daily.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400 text-sm">No data for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto">
              {daily.map((d) => (
                <div key={d.date} className="flex-1 min-w-6 flex flex-col items-center gap-1 group">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${Math.max((d.revenue / maxRevenue) * 160, d.revenue > 0 ? 4 : 2)}px`,
                        background: d.revenue > 0 ? '#4a7530' : '#e5e7eb',
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                        <p className="font-medium">{new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</p>
                        <p>Rs. {d.revenue.toLocaleString()}</p>
                        <p className="text-gray-400">{d.count} invoice(s)</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(d.date).toLocaleDateString('en', { day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor earnings */}
        <div className="bg-white rounded-2xl card-shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Doctor-wise Earnings</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : doctorStats.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No doctor data for this period</p>
          ) : (
            <div className="space-y-4">
              {doctorStats.map((d, i) => (
                <div key={d.doctor_name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: '#4a7530' }}
                      >
                        {d.doctor_name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-24">{d.doctor_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">Rs. {d.total.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(d.total / (doctorStats[0]?.total || 1)) * 100}%`,
                        background: '#4a7530',
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{d.count} invoices</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding payments */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Outstanding Payments</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pending and partial invoices</p>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : outstanding.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <p className="text-gray-500 font-medium">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No outstanding payments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Invoice</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Patient</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Amount</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {outstanding.map(inv => (
                  <tr key={inv.invoice_number} className="table-row-hover">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-mono font-medium text-gray-800">{inv.invoice_number}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{inv.patient_name}</p>
                      <p className="text-xs text-gray-400">{inv.patient_phone}</p>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <p className="text-sm font-semibold text-gray-900">Rs. {inv.total.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[inv.payment_status] ?? 'badge-pending'}`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
