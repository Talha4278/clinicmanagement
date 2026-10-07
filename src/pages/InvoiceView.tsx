import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft, CheckCircle, Clock, AlertTriangle, Stethoscope, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../lib/types';
import { useClinicSettings } from '../lib/clinicSettings';
import { generatePaymentWhatsAppMessage, formatFriendlyDate } from '../lib/whatsapp';
import WhatsAppModal, { WhatsAppModalProps } from '../components/WhatsAppModal';
import { isDemoMode, getDemoInvoices, updateDemoInvoicePayment } from '../lib/demoData';
import { useAuth } from '../contexts/AuthContext';
import { applyClinicFilter, isMissingClinicIdColumnError } from '../lib/tenancyQuery';

interface Props {
  invoiceId: string;
  onBack: () => void;
}

const itemTypeLabels: Record<string, string> = {
  consultation: 'Consultation',
  lab: 'Lab Test',
  medicine: 'Medicine',
  procedure: 'Procedure',
};

const statusIcons: Record<string, React.ReactNode> = {
  paid: <CheckCircle size={16} className="text-green-600" />,
  pending: <Clock size={16} className="text-yellow-600" />,
  partial: <AlertTriangle size={16} className="text-blue-600" />,
};

export default function InvoiceView({ invoiceId, onBack }: Props) {
  const { activeClinic } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // WhatsApp Modal State
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

  function handleOpenWhatsApp() {
    if (!invoice) return;
    const patientObj = invoice.patient as any;
    const patientName = patientObj?.name || 'Valued Patient';
    const patientPhone = patientObj?.phone || '';
    const totalAmount = Number(invoice.total) || 0;
    const isPartial = invoice.payment_status === 'partial';
    const paidAmount = isPartial ? Math.round(totalAmount * 0.5) : 0;
    const pendingAmount = totalAmount - paidAmount;
    const itemsDescription = items.length > 0 ? items.map(i => i.item_name).join(', ') : 'Clinical Consultation & Procedures';

    const message = generatePaymentWhatsAppMessage({
      patientName,
      phone: patientPhone,
      invoiceNumber: invoice.invoice_number,
      procedureOrServices: itemsDescription,
      totalAmount,
      paidAmount,
      pendingAmount,
      date: invoice.created_at.split('T')[0],
      clinicSettings: clinic,
    });

    setWhatsappModal({
      isOpen: true,
      title: 'WhatsApp Payment Reminder',
      patientName,
      patientPhone,
      message,
      metadata: {
        procedure: itemsDescription,
        date: formatFriendlyDate(invoice.created_at.split('T')[0]),
        totalAmount,
        pendingAmount,
        invoiceNumber: invoice.invoice_number,
        statusBadge: invoice.payment_status,
      },
    });
  }

  useEffect(() => { fetchInvoice(); }, [invoiceId, activeClinic?.id]);

  async function fetchInvoice() {
    setLoading(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    if (isDemoMode()) {
      const demoInvoices = getDemoInvoices();
      const match = demoInvoices.find((i) => i.id === invoiceId) || demoInvoices[0];
      if (match) {
        setInvoice(match);
        setItems(match.items || []);
      }
      setLoading(false);
      return;
    }

    let loadedInvoice: Invoice | null = null;
    let loadedItems: InvoiceItem[] = [];

    try {
      let query = supabase
        .from('invoices')
        .select('*, patient:patients(*), doctor:staff!invoices_doctor_id_fkey(name, specialization, phone), creator:staff!invoices_created_by_fkey(name)')
        .eq('id', invoiceId);
      query = applyClinicFilter(query, clinicId);

      const [invRes, itemsRes] = await Promise.all([
        query.maybeSingle(),
        supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('created_at'),
      ]);

      if (invRes.error && isMissingClinicIdColumnError(invRes.error)) {
        const fallback = await supabase
          .from('invoices')
          .select('*, patient:patients(*), doctor:staff!invoices_doctor_id_fkey(name, specialization, phone), creator:staff!invoices_created_by_fkey(name)')
          .eq('id', invoiceId)
          .maybeSingle();
        loadedInvoice = fallback.data as Invoice;
      } else if (invRes.data) {
        loadedInvoice = invRes.data as Invoice;
      }
      loadedItems = itemsRes.data ?? [];
    } catch {
      // ignore
    }

    setInvoice(loadedInvoice);
    setItems(loadedItems);
    setLoading(false);
  }

  async function markPaid() {
    if (!invoice) return;
    setUpdating(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    if (isDemoMode()) {
      updateDemoInvoicePayment(invoice.id, invoice.total);
      setInvoice({ ...invoice, payment_status: 'paid', paid_amount: invoice.total });
      setUpdating(false);
      return;
    }

    try {
      let { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'paid' })
        .eq('id', invoice.id);
      if (error && isMissingClinicIdColumnError(error)) {
        await supabase.from('invoices').update({ payment_status: 'paid' }).eq('id', invoice.id);
      }
    } catch {
      // ignore
    }

    const updated = { ...invoice, payment_status: 'paid' as const, paid_amount: invoice.total };
    setInvoice(updated);
    setUpdating(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400">Invoice not found</p>
        <button onClick={onBack} className="mt-3 text-sm hover:underline" style={{ color: '#4a7530' }}>Go back</button>
      </div>
    );
  }

  const patient = invoice.patient as any;
  const doctor = invoice.doctor as any;
  const creator = invoice.creator as any;

  const statusBg: Record<string, string> = {
    paid: 'badge-paid',
    pending: 'badge-pending',
    partial: 'badge-partial',
  };

  const methodLabel: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between gap-4 no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {invoice.payment_status !== 'paid' && (
            <>
              <button
                onClick={handleOpenWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-95 shadow-xs"
                style={{ background: '#25D366' }}
              >
                <MessageSquare size={15} /> WhatsApp Reminder
              </button>
              <button
                onClick={markPaid}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                <CheckCircle size={15} /> Mark as Paid
              </button>
            </>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
            style={{ background: '#3c5e27' }}
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="bg-white rounded-2xl card-shadow-md overflow-hidden" id="invoice-print">
        {/* Invoice header */}
        <div className="p-8" style={{ background: '#3c5e27' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {clinic.logo_url ? (
                  <img src={clinic.logo_url} alt={clinic.clinic_name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Stethoscope className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl text-white font-bold">{clinic.clinic_name || 'Dentivista'}</h1>
                {clinic.tagline && <p className="text-white/80 text-sm font-medium">{clinic.tagline}</p>}
                <p className="text-white/60 text-xs mt-0.5 max-w-md">{clinic.address}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-white/70 text-xs mt-1">
                  {clinic.phone && <span>Ph: {clinic.phone}</span>}
                  {clinic.email && <span>• {clinic.email}</span>}
                  {clinic.tax_number && <span>• {clinic.tax_number}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs uppercase tracking-widest">Invoice</p>
              <p className="text-white font-mono text-2xl font-bold mt-1">{invoice.invoice_number}</p>
              <p className="text-white/60 text-sm mt-1">{new Date(invoice.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white capitalize`}>
                {statusIcons[invoice.payment_status]}
                {invoice.payment_status}
              </div>
            </div>
          </div>
        </div>

        {/* Patient & Doctor info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-8 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bill To</p>
            <p className="font-semibold text-gray-900 text-lg">{patient?.name}</p>
            <p className="text-sm text-gray-500 mt-1">{patient?.phone}</p>
            {patient?.email && <p className="text-sm text-gray-500">{patient.email}</p>}
            {patient?.address && <p className="text-sm text-gray-400 mt-1">{patient.address}</p>}
          </div>
          <div className="sm:text-right">
            {doctor && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Attending Doctor</p>
                <p className="font-semibold text-gray-900">{doctor.name}</p>
                {doctor.specialization && <p className="text-sm text-gray-500">{doctor.specialization}</p>}
                {doctor.phone && <p className="text-sm text-gray-400">{doctor.phone}</p>}
              </>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Description</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 hidden sm:table-cell">Type</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Qty</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Unit Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  </td>
                  <td className="py-3.5 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {itemTypeLabels[item.item_type] ?? item.item_type}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-sm text-gray-600">{Number(item.quantity)}</td>
                  <td className="py-3.5 text-right text-sm text-gray-600">{clinic.currency_symbol || 'AED '}{Number(item.unit_price).toLocaleString()}</td>
                  <td className="py-3.5 text-right text-sm font-semibold text-gray-900">{clinic.currency_symbol || 'AED '}{Number(item.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 pb-8">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{clinic.currency_symbol || 'AED '}{Number(invoice.subtotal).toLocaleString()}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Discount {invoice.discount_type === 'percentage' ? `(${invoice.discount_value}%)` : ''}
                </span>
                <span className="text-red-600">- {clinic.currency_symbol || 'AED '}{Number(invoice.discount_amount).toLocaleString()}</span>
              </div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{clinic.tax_label || 'VAT / Tax'} ({invoice.tax_rate}%)</span>
                <span className="text-gray-900">+ {clinic.currency_symbol || 'AED '}{Number(invoice.tax_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="border-t-2 border-gray-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-900 text-base">Total</span>
              <span className="font-bold text-xl" style={{ color: '#3c5e27' }}>{clinic.currency_symbol || 'AED '}{Number(invoice.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-gray-500">Payment Method</span>
              <span className="text-gray-700 capitalize">{methodLabel[invoice.payment_method] ?? invoice.payment_method}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBg[invoice.payment_status]}`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 pb-6 border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between" style={{ background: 'var(--cream)' }}>
          <div>
            <p className="text-xs text-gray-400">Created by {creator?.name ?? 'System'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(invoice.created_at).toLocaleString('en-PK')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-700">{clinic.clinic_name} {clinic.tagline ? `— ${clinic.tagline}` : ''}</p>
            <p className="text-xs text-gray-500 mt-0.5">{clinic.phone} {clinic.email ? `• ${clinic.email}` : ''}</p>
          </div>
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
