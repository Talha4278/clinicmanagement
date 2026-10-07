import { useEffect, useState } from 'react';
import { Search, Plus, X, FileText, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, PaymentStatus } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useClinicSettings } from '../lib/clinicSettings';
import { generatePaymentWhatsAppMessage, formatFriendlyDate } from '../lib/whatsapp';
import WhatsAppModal, { WhatsAppModalProps } from '../components/WhatsAppModal';
import { isDemoMode, getDemoInvoices } from '../lib/demoData';
import { getClinicInvoices } from '../lib/clinicStorage';

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
  const { staff, activeClinic } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const isReceptionist = staff?.role === 'receptionist';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');

  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean;
    title: string;
    patientName: string;
    patientPhone: string;
    message: string;
    metadata?: WhatsAppModalProps['metadata'];
  }>({
    isOpen: false,
    title: '',
    patientName: '',
    patientPhone: '',
    message: '',
  });

  function handleOpenWhatsApp(e: React.MouseEvent, inv: Invoice) {
    e.stopPropagation();
    const patientName = (inv.patient as any)?.name || 'Valued Patient';
    const patientPhone = (inv.patient as any)?.phone || '';
    const totalAmount = Number(inv.total) || 0;
    const isPartial = inv.payment_status === 'partial';
    const paidAmount = isPartial ? Math.round(totalAmount * 0.5) : 0;
    const pendingAmount = totalAmount - paidAmount;
    const doctorName = (inv.doctor as any)?.name;
    const procedureOrServices = `Dental Care & Clinical Services (${inv.invoice_number})`;

    const message = generatePaymentWhatsAppMessage({
      patientName,
      phone: patientPhone,
      invoiceNumber: inv.invoice_number,
      procedureOrServices,
      totalAmount,
      paidAmount,
      pendingAmount,
      date: inv.created_at.split('T')[0],
      clinicSettings: clinic,
    });

    setWhatsappModal({
      isOpen: true,
      title: 'WhatsApp Payment Reminder',
      patientName,
      patientPhone,
      message,
      metadata: {
        procedure: procedureOrServices,
        date: formatFriendlyDate(inv.created_at.split('T')[0]),
        totalAmount,
        pendingAmount,
        invoiceNumber: inv.invoice_number,
        statusBadge: inv.payment_status,
      },
    });
  }

  useEffect(() => { fetchInvoices(); }, [activeClinic?.id]);

  async function fetchInvoices() {
    setLoading(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    if (isDemoMode()) {
      setInvoices(getDemoInvoices());
      setLoading(false);
      return;
    }

    let remoteInvoices: Invoice[] = [];
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, patient:patients(name, phone), doctor:staff!invoices_doctor_id_fkey(name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        remoteInvoices = data as Invoice[];
      }
    } catch {
      // fallback
    }

    const localInvoices = getClinicInvoices(clinicId);
    const invMap = new Map<string, Invoice>();
    localInvoices.forEach(i => invMap.set(i.id, i));
    remoteInvoices.forEach(i => invMap.set(i.id, i));

    setInvoices(Array.from(invMap.values()));
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
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.payment_status !== 'paid' && (
                          <button
                            type="button"
                            title="Send WhatsApp Payment Reminder"
                            onClick={(e) => handleOpenWhatsApp(e, inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                          >
                            <MessageSquare size={13} className="text-emerald-600" />
                            <span className="hidden sm:inline">Remind</span>
                          </button>
                        )}
                        <button
                          type="button"
                          title="View Invoice"
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Payment Reminder Modal */}
      <WhatsAppModal
        isOpen={whatsappModal.isOpen}
        onClose={() => setWhatsappModal(prev => ({ ...prev, isOpen: false }))}
        title={whatsappModal.title}
        patientName={whatsappModal.patientName}
        patientPhone={whatsappModal.patientPhone}
        initialMessage={whatsappModal.message}
        metadata={whatsappModal.metadata}
      />
    </div>
  );
}
