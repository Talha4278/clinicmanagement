import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Banknote, Building2, AlertCircle, Sparkles } from 'lucide-react';
import { Invoice, PaymentMethod, PaymentStatus } from '../lib/types';
import { supabase } from '../lib/supabase';
import { isDemoMode, updateDemoInvoicePayment } from '../lib/demoData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  currencySymbol?: string;
  onSuccess: (updatedInvoice: Invoice) => void;
}

export default function EditPaymentModal({
  isOpen,
  onClose,
  invoice,
  currencySymbol = 'Rs.',
  onSuccess,
}: Props) {
  if (!isOpen || !invoice) return null;

  const total = Number(invoice.total) || 0;
  const initialPaid = Number(
    invoice.paid_amount !== undefined && invoice.paid_amount !== null
      ? invoice.paid_amount
      : invoice.payment_status === 'paid'
      ? total
      : 0
  );

  const [paidAmount, setPaidAmount] = useState<number>(initialPaid);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(invoice.payment_method || 'cash');
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-sync whenever the invoice changes or modal opens
  useEffect(() => {
    if (invoice) {
      const currentPaid = Number(
        invoice.paid_amount !== undefined && invoice.paid_amount !== null
          ? invoice.paid_amount
          : invoice.payment_status === 'paid'
          ? Number(invoice.total) || 0
          : 0
      );
      setPaidAmount(currentPaid);
      setPaymentMethod(invoice.payment_method || 'cash');
      setNotes(invoice.notes || '');
      setError('');
    }
  }, [invoice, isOpen]);

  // Dynamic calculations
  const sanitizedPaid = isNaN(paidAmount) ? 0 : Math.max(0, paidAmount);
  const remainingBalance = Math.max(0, total - sanitizedPaid);
  const percentagePaid = total > 0 ? Math.min(100, Math.round((sanitizedPaid / total) * 100)) : 100;

  // Auto-calculated Payment Status
  let computedStatus: PaymentStatus = 'pending';
  if (sanitizedPaid >= total && total > 0) {
    computedStatus = 'paid';
  } else if (sanitizedPaid > 0) {
    computedStatus = 'partial';
  } else {
    computedStatus = 'pending';
  }

  function handleSetFull() {
    setPaidAmount(total);
  }

  function handleSetFiftyPercent() {
    setPaidAmount(Math.round(total * 0.5));
  }

  function handleSetZero() {
    setPaidAmount(0);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;

    if (paidAmount < 0) {
      setError('Paid amount cannot be negative');
      return;
    }

    setSaving(true);
    setError('');

    const nowStr = new Date().toISOString();
    const updatedInvoiceData: Invoice = {
      ...invoice,
      paid_amount: sanitizedPaid,
      payment_status: computedStatus,
      payment_method: paymentMethod,
      notes: notes.trim() || null,
      updated_at: nowStr,
    };

    try {
      if (isDemoMode()) {
        updateDemoInvoicePayment(invoice.id, sanitizedPaid, paymentMethod, notes.trim() || undefined);
        onSuccess(updatedInvoiceData);
        setSaving(false);
        onClose();
        return;
      }

      // Update in Supabase
      const payload: any = {
        paid_amount: sanitizedPaid,
        payment_status: computedStatus,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      };

      let { error: updateError } = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', invoice.id);

      // Graceful fallback if paid_amount column does not exist on legacy Supabase instance
      if (updateError && (updateError.message?.includes('paid_amount') || updateError.details?.includes('paid_amount'))) {
        const { paid_amount, ...legacyPayload } = payload;
        const fallbackRes = await supabase
          .from('invoices')
          .update(legacyPayload)
          .eq('id', invoice.id);
        updateError = fallbackRes.error;
      }

      if (updateError) {
        setError(updateError.message || 'Failed to update payment record');
        setSaving(false);
        return;
      }

      onSuccess(updatedInvoiceData);
      setSaving(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
      setSaving(false);
    }
  }

  const patient = (invoice.patient as any)?.name || 'Valued Patient';
  const patientPhone = (invoice.patient as any)?.phone || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                {invoice.invoice_number}
              </span>
              <span
                className={`text-2xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  computedStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : computedStatus === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {computedStatus === 'paid' ? 'Paid in Full' : computedStatus === 'partial' ? 'Partial Payment' : 'Pending Payment'}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 mt-1">
              Edit Payment Record
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Adjust amount paid and auto-calculate remaining balance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
            <div>
              <p className="font-semibold text-gray-800">{patient}</p>
              {patientPhone && <p className="text-gray-500 mt-0.5">{patientPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-gray-400">Total Bill Amount</p>
              <p className="text-sm font-bold text-gray-900">
                {currencySymbol} {total.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Live Auto-Calculation Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Total Bill</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                {currencySymbol} {total.toLocaleString()}
              </p>
              <span className="text-3xs text-slate-400">Invoice Total</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider">Amount Paid</p>
              <p className="text-base font-bold text-emerald-800 mt-1">
                {currencySymbol} {sanitizedPaid.toLocaleString()}
              </p>
              <span className="text-3xs text-emerald-600 font-medium">{percentagePaid}% collected</span>
            </div>

            <div
              className={`rounded-xl p-3 text-center border ${
                remainingBalance > 0
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-green-50/80 border-green-200 text-green-900'
              }`}
            >
              <p
                className={`text-2xs font-semibold uppercase tracking-wider ${
                  remainingBalance > 0 ? 'text-amber-700' : 'text-green-700'
                }`}
              >
                Remaining
              </p>
              <p
                className={`text-base font-bold mt-1 ${
                  remainingBalance > 0 ? 'text-amber-900' : 'text-green-800'
                }`}
              >
                {currencySymbol} {remainingBalance.toLocaleString()}
              </p>
              <span
                className={`text-3xs font-medium ${
                  remainingBalance > 0 ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {remainingBalance > 0 ? 'Balance Due' : 'Fully Settled ✓'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-2xs text-gray-500 font-medium">
              <span>Settlement Progress</span>
              <span>{percentagePaid}% Paid</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  percentagePaid >= 100
                    ? 'bg-emerald-600'
                    : percentagePaid > 0
                    ? 'bg-amber-500'
                    : 'bg-gray-300'
                }`}
                style={{ width: `${percentagePaid}%` }}
              />
            </div>
          </div>

          {/* Amount Paid Input Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">
                Amount Paid ({currencySymbol})
              </label>
              <span className="text-2xs text-gray-400">
                Remaining auto-calculates as you type
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                {currencySymbol}
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={paidAmount === 0 ? '' : paidAmount}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setPaidAmount(isNaN(val) ? 0 : val);
                }}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-base font-bold text-gray-900 focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                autoFocus
              />
            </div>

            {/* Quick Action Presets */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-2xs text-gray-400 font-medium mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={handleSetFull}
                className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              >
                100% Full ({currencySymbol} {total.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={handleSetFiftyPercent}
                className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
              >
                50% Deposit ({currencySymbol} {Math.round(total * 0.5).toLocaleString()})
              </button>
              <button
                type="button"
                onClick={handleSetZero}
                className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Unpaid (0)
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                style={paymentMethod === 'cash' ? { borderColor: 'var(--primary-color)', background: 'var(--primary-50)', color: 'var(--primary-color)' } : {}}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  paymentMethod === 'cash'
                    ? 'shadow-2xs font-semibold'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Banknote size={15} style={paymentMethod === 'cash' ? { color: 'var(--primary-color)' } : { color: '#9ca3af' }} />
                Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                style={paymentMethod === 'card' ? { borderColor: 'var(--primary-color)', background: 'var(--primary-50)', color: 'var(--primary-color)' } : {}}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  paymentMethod === 'card'
                    ? 'shadow-2xs font-semibold'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={15} style={paymentMethod === 'card' ? { color: 'var(--primary-color)' } : { color: '#9ca3af' }} />
                Card
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                style={paymentMethod === 'bank_transfer' ? { borderColor: 'var(--primary-color)', background: 'var(--primary-50)', color: 'var(--primary-color)' } : {}}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'shadow-2xs font-semibold'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 size={15} style={paymentMethod === 'bank_transfer' ? { color: 'var(--primary-color)' } : { color: '#9ca3af' }} />
                Bank Transfer
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Payment Notes / Reference</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received partial advance via online transfer, ref #..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all resize-none"
            />
          </div>

          {/* Auto Calculation Preview Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-2xs leading-relaxed">
              <span className="font-semibold">Auto-calculated status: </span>
              {computedStatus === 'paid' && (
                <span>Invoice will be marked <strong className="text-green-700 font-bold">Paid</strong> because full amount ({currencySymbol} {total.toLocaleString()}) has been received.</span>
              )}
              {computedStatus === 'partial' && (
                <span>Invoice will be marked <strong className="text-amber-700 font-bold">Partial</strong> with an outstanding balance of <strong className="text-amber-800">{currencySymbol} {remainingBalance.toLocaleString()}</strong>.</span>
              )}
              {computedStatus === 'pending' && (
                <span>Invoice will remain <strong className="text-rose-700 font-bold">Pending</strong> with full balance of <strong className="text-rose-800">{currencySymbol} {total.toLocaleString()}</strong> due.</span>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: 'var(--primary-color, #0284c7)' }}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Update Payment Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
