import { useEffect, useState } from 'react';
import { Search, Plus, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, PaymentStatus } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNewInvoice: () => void;
  onViewInvoice: (id: string) => void;
}

const statusBadge: Record<PaymentStatus, string> = {
  paid: 'badge-paid',
  pending: 'badge-pending',
  partial: 'badge-partial',
};

const methodLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

export default function Invoices({ onNewInvoice, onViewInvoice }: Props) {
  const { staff } = useAuth();
  const isReceptionist = staff?.role === 'receptionist';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, patient:patients(name, phone), doctor:staff!invoices_doctor_id_fkey(name)')
      .order('created_at', { ascending: false });
    setInvoices((data as Invoice[]) ?? []);
    setLoading(false);
  }

  const filtered = invoices.filter(inv => {
    const patient = (inv.patient as any)?.name ?? '';
    const matchSearch = !search ||
      patient.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const pending = invoices.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-gray-900">Billing & Invoices</h2>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={onNewInvoice}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Summary */}
      <div className={`grid grid-cols-1 ${isReceptionist ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'} gap-4`}>
        {!isReceptionist && (
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-gray-500 mb-1">Total Collected</p>
            <p className="text-xl font-bold text-gray-900">Rs. {totalRevenue.toLocaleString()}</p>
            <span className="text-xs badge-paid px-2 py-0.5 rounded-full font-medium">{invoices.filter(i => i.payment_status === 'paid').length} paid</span>
          </div>
        )}
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-gray-900">Rs. {pending.toLocaleString()}</p>
          <span className="text-xs badge-pending px-2 py-0.5 rounded-full font-medium">{invoices.filter(i => i.payment_status !== 'paid').length} unpaid</span>
        </div>
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
          <span className="text-xs text-gray-400">All time</span>
        </div>
      </div>


      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by patient or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
          className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">Invoice</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">Patient</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5 hidden md:table-cell">Doctor</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5 hidden sm:table-cell">Method</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5 hidden lg:table-cell">Date</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">Amount</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {search || statusFilter ? 'No invoices match your filters' : 'No invoices created yet'}
                    </p>
                    {!search && !statusFilter && (
                      <button onClick={onNewInvoice} className="mt-3 text-sm font-medium hover:underline" style={{ color: '#4a7530' }}>
                        Create first invoice
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onViewInvoice(inv.id)}
                    className="table-row-hover cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono font-medium text-gray-800">{inv.invoice_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{(inv.patient as any)?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{(inv.patient as any)?.phone}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{(inv.doctor as any)?.name ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <p className="text-sm text-gray-600 capitalize">{methodLabel[inv.payment_method] ?? inv.payment_method}</p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <p className="text-sm text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-gray-900">Rs. {Number(inv.total).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[inv.payment_status]}`}>
                        {inv.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
