import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Staff, ItemType, DiscountType, PaymentMethod, PaymentStatus } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode, getDemoPatients, DEMO_STAFF_MEMBERS, saveDemoInvoice } from '../lib/demoData';

interface LineItem {
  item_type: ItemType;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  onSuccess: (invoiceId: string) => void;
}

const itemTypeLabels: Record<ItemType, string> = {
  consultation: 'Consultation',
  lab: 'Lab Test',
  medicine: 'Medicine',
  procedure: 'Procedure',
};

const defaultItems: LineItem[] = [
  { item_type: 'consultation', description: 'Dental Consultation', quantity: 1, unit_price: 0 },
];

export default function NewInvoice({ onSuccess }: Props) {
  const { staff } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [items, setItems] = useState<LineItem[]>([...defaultItems]);
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  async function fetchDoctors() {
    if (isDemoMode()) {
      const docs = DEMO_STAFF_MEMBERS.filter((s) => s.role === 'doctor');
      setDoctors(docs);
      if (staff?.role === 'doctor') setSelectedDoctor(staff.id);
      return;
    }
    const { data } = await supabase.from('staff').select('*').eq('role', 'doctor').eq('active', true);
    setDoctors(data ?? []);
    if (staff?.role === 'doctor') setSelectedDoctor(staff.id);
  }

  async function fetchPatients() {
    if (isDemoMode()) {
      setPatients(getDemoPatients());
      return;
    }
    const { data } = await supabase.from('patients').select('*').order('name');
    setPatients(data ?? []);
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone.includes(patientSearch)
  );

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountAmount = discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : Math.min(discountValue, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  function addItem() {
    setItems([...items, { item_type: 'consultation', description: '', quantity: 1, unit_price: 0 }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) { setError('Please select a patient'); return; }
    if (items.length === 0) { setError('Add at least one item'); return; }
    if (items.some(i => !i.description.trim())) { setError('All items must have a description'); return; }
    setSaving(true);
    setError('');

    if (isDemoMode()) {
      const demoInv = saveDemoInvoice({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor || null,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        paid_amount: paymentStatus === 'paid' ? total : 0,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        })),
      });
      onSuccess(demoInv.id);
      return;
    }

    const isValidUuid = (val?: string | null) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        patient_id: selectedPatient.id,
        doctor_id: isValidUuid(selectedDoctor) ? selectedDoctor : null,
        created_by: isValidUuid(staff?.id) ? staff?.id : null,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (invErr || !inv) {
      setError(invErr?.message ?? 'Failed to create invoice');
      setSaving(false);
      return;
    }

    const lineItems = items.map(item => ({
      invoice_id: inv.id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    const { error: itemsErr } = await supabase.from('invoice_items').insert(lineItems);
    if (itemsErr) {
      setError(itemsErr.message);
      setSaving(false);
      return;
    }

    onSuccess(inv.id);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="font-display text-2xl text-gray-900">New Invoice</h2>
        <p className="text-sm text-gray-500 mt-0.5">Create a billing record for a patient visit</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Patient selection */}
          <div className="bg-white rounded-2xl card-shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Patient</h3>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Patient *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={selectedPatient ? selectedPatient.name : patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setSelectedPatient(null);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  placeholder="Search patient by name or phone..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showPatientDropdown && !selectedPatient && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No patients found</p>
                  ) : (
                    filteredPatients.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(''); setShowPatientDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#4a7530' }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.phone}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--primary-50)' }}>
                <p className="text-sm font-semibold text-gray-800">{selectedPatient.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedPatient.phone}</p>
                {selectedPatient.allergies && (
                  <p className="text-xs text-red-600 mt-1">Allergies: {selectedPatient.allergies}</p>
                )}
              </div>
            )}
          </div>

          {/* Doctor & payment */}
          <div className="bg-white rounded-2xl card-shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Doctor & Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attending Doctor</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                >
                  <option value="">No doctor assigned</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl card-shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Services & Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ background: '#f2f7ef', color: '#3c5e27' }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide px-3">
              <div className="col-span-2">Type</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price (Rs.)</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
                <div className="md:col-span-2">
                  <label className="md:hidden text-xs text-gray-500 mb-1 block">Type</label>
                  <select
                    value={item.item_type}
                    onChange={(e) => updateItem(idx, 'item_type', e.target.value as ItemType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  >
                    {(Object.keys(itemTypeLabels) as ItemType[]).map(t => (
                      <option key={t} value={t}>{itemTypeLabels[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="md:hidden text-xs text-gray-500 mb-1 block">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="md:hidden text-xs text-gray-500 mb-1 block">Qty</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="md:hidden text-xs text-gray-500 mb-1 block">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
                <div className="md:col-span-1 flex items-center md:justify-end">
                  <span className="text-sm font-semibold text-gray-700">
                    {(item.quantity * item.unit_price).toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="md:col-span-1 flex items-center md:justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals + notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Notes */}
          <div className="bg-white rounded-2xl card-shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Additional notes for the invoice..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
            />
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl card-shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Bill Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">Rs. {subtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-600/20 focus:border-green-700"
                >
                  <option value="fixed">Fixed Discount (Rs.)</option>
                  <option value="percentage">% Discount</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:ring-2 focus:ring-green-600/20 focus:border-green-700"
                  placeholder="0"
                />
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600 font-medium">- Rs. {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 flex-shrink-0">Tax %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:ring-2 focus:ring-green-600/20 focus:border-green-700"
                  placeholder="0"
                />
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium text-gray-900">+ Rs. {taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold" style={{ color: '#3c5e27' }}>Rs. {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-60"
            style={{ background: '#3c5e27' }}
          >
            {saving ? 'Creating...' : (
              <>
                <Check size={16} /> Create Invoice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
