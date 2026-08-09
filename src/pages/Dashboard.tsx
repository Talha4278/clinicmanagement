import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, FileText, AlertCircle, Plus, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, Patient } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalPatients: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingAmount: number;
  todayInvoices: number;
}

export default function Dashboard({ onNavigate }: Props) {
  const { staff } = useAuth();
  const isReceptionist = staff?.role === 'receptionist';

  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    pendingAmount: 0,
    todayInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [patientsRes, todayInvRes, monthInvRes, pendingRes, recentInvRes, recentPatRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('total').gte('created_at', todayStr).eq('payment_status', 'paid'),
      supabase.from('invoices').select('total').gte('created_at', monthStart).eq('payment_status', 'paid'),
      supabase.from('invoices').select('total').in('payment_status', ['pending', 'partial']),
      supabase.from('invoices').select('*, patient:patients(name,phone), doctor:staff!invoices_doctor_id_fkey(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    const todayCount = await supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', todayStr);

    setStats({
      totalPatients: patientsRes.count ?? 0,
      todayRevenue: (todayInvRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      monthRevenue: (monthInvRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      pendingAmount: (pendingRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      todayInvoices: todayCount.count ?? 0,
    });

    setRecentInvoices((recentInvRes.data as Invoice[]) ?? []);
    setRecentPatients((recentPatRes.data as Patient[]) ?? []);
    setLoading(false);
  }

  const allStatCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients.toLocaleString(),
      icon: Users,
      color: '#3c5e27',
      bg: '#f2f7ef',
      sub: 'Registered patients',
    },
    {
      label: "Today's Revenue",
      value: `Rs. ${stats.todayRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: '#1d4ed8',
      bg: '#eff6ff',
      sub: `${stats.todayInvoices} invoices today`,
    },
    {
      label: 'Monthly Revenue',
      value: `Rs. ${stats.monthRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: '#047857',
      bg: '#ecfdf5',
      sub: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    },
    {
      label: 'Pending Payments',
      value: `Rs. ${stats.pendingAmount.toLocaleString()}`,
      icon: AlertCircle,
      color: '#b45309',
      bg: '#fffbeb',
      sub: 'Outstanding balance',
    },
  ];

  const statCards = isReceptionist
    ? allStatCards.filter(card => card.label !== "Today's Revenue" && card.label !== 'Monthly Revenue')
    : allStatCards;

  const statusColors: Record<string, string> = {
    paid: 'badge-paid',
    pending: 'badge-pending',
    partial: 'badge-partial',
  };

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: '#3c5e27' }}
      >
        <div>
          <p className="text-white/70 text-sm">Quick Actions</p>
          <h2 className="font-display text-2xl text-white mt-1">Manage Clinic Operations</h2>
          <p className="text-white/60 text-sm mt-1">Book appointments or bill a patient for consultation & treatments</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => onNavigate('appointments')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Calendar size={16} />
            Book Appointment
          </button>
          <button
            onClick={() => onNavigate('new-invoice')}
            className="flex items-center gap-2 bg-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
            style={{ color: '#3c5e27' }}
          >
            <Plus size={16} />
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isReceptionist ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-4`}>
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 card-shadow">
            <div className="flex items-start justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg }}
              >
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3">{loading ? '—' : card.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className={`grid grid-cols-1 ${isReceptionist ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-6`}>
        {/* Recent invoices - Hidden for Receptionists */}
        {!isReceptionist && (
          <div className="bg-white rounded-2xl card-shadow overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
              <button
                onClick={() => onNavigate('invoices')}
                className="flex items-center gap-1 text-sm hover:underline"
                style={{ color: '#4a7530' }}
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : recentInvoices.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No invoices yet</div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-3.5 table-row-hover">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {(inv.patient as any)?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">{inv.invoice_number}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">Rs. {Number(inv.total).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[inv.payment_status]}`}>
                        {inv.payment_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent patients */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Recent Patients</h3>
            <button
              onClick={() => onNavigate('patients')}
              className="flex items-center gap-1 text-sm hover:underline"
              style={{ color: '#4a7530' }}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : recentPatients.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No patients yet</div>
            ) : (
              recentPatients.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 table-row-hover">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: '#4a7530' }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.phone}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

