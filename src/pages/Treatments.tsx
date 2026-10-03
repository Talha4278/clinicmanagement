import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Plus, Search,
  FileText, AlertCircle, Edit, Trash2, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Treatment, TreatmentStatus, Patient, Staff } from '../lib/types';
import { getTreatments, saveTreatment, deleteTreatment } from '../lib/clinicStorage';
import { isDemoMode, getDemoPatients, DEMO_STAFF_MEMBERS, getDemoStaff } from '../lib/demoData';
import { useClinicSettings } from '../lib/clinicSettings';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  preselectedPatientId?: string | null;
  onNewInvoice?: (patientId: string, description: string, amount: number) => void;
  onViewPatientDossier?: (patientId: string) => void;
}

const COMMON_DENTAL_PROCEDURES = [
  'Composite Restoration (Tooth-Colored Filling)',
  'Root Canal Treatment (RCT - Premolar/Anterior)',
  'Root Canal Treatment (RCT - Molar)',
  'Post & Core Buildup',
  'Porcelain Fused to Metal (PFM) Crown',
  'Zirconia / All-Ceramic Crown',
  'Titanium Dental Implant Placement',
  'Surgical Tooth Extraction',
  'Simple Tooth Extraction',
  'Ultrasonic Scaling & Polishing',
  'In-Office Teeth Whitening',
  'Dental Veneer / Laminate',
  'Orthodontic Alignment Consultation',
  'Gingival Curettage / Deep Cleaning',
];

const emptyTreatmentForm = {
  patient_id: '',
  doctor_id: '',
  treatment_date: new Date().toISOString().split('T')[0],
  tooth_number: '',
  procedure_name: '',
  custom_procedure: '',
  cost: 0,
  status: 'planned' as TreatmentStatus,
  notes: '',
};

export default function Treatments({
  preselectedPatientId,
  onNewInvoice,
  onViewPatientDossier,
}: Props) {
  const { staff: currentStaff } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const proceduresList = clinic?.procedures && clinic.procedures.length > 0
    ? clinic.procedures
    : COMMON_DENTAL_PROCEDURES;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [form, setForm] = useState({ ...emptyTreatmentForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    if (isDemoMode()) {
      const trts = await getTreatments();
      const demoPats = getDemoPatients();
      const demoDocs = getDemoStaff().filter((s) => s.role === 'doctor' && s.active !== false);
      setTreatments(trts);
      setPatients(demoPats);
      setDoctors(demoDocs);
      if (preselectedPatientId) {
        const match = demoPats.find((p) => p.id === preselectedPatientId);
        if (match) {
          openAddModal(match.id);
        }
      }
      setLoading(false);
      return;
    }

    const [trts, patRes, docRes] = await Promise.all([
      getTreatments(),
      supabase.from('patients').select('*').order('name'),
      supabase.from('staff').select('*').eq('role', 'doctor').eq('active', true),
    ]);

    setTreatments(trts);
    setPatients(patRes.data || []);
    const availableDocs = (docRes.data && docRes.data.length > 0)
      ? docRes.data
      : (currentStaff ? [currentStaff] : []);
    setDoctors(availableDocs);

    if (preselectedPatientId && patRes.data) {
      const match = patRes.data.find((p) => p.id === preselectedPatientId);
      if (match) {
        openAddModal(match.id);
      }
    }
    setLoading(false);
  }

  function openAddModal(patientId?: string) {
    setEditingTreatment(null);
    setForm({
      ...emptyTreatmentForm,
      patient_id: patientId || (patients.length > 0 ? patients[0].id : ''),
      doctor_id: doctors.length > 0 ? doctors[0].id : '',
    });
    setError('');
    setShowModal(true);
  }

  function openEditModal(t: Treatment) {
    setEditingTreatment(t);
    const isCustom = !proceduresList.includes(t.procedure_name);
    setForm({
      patient_id: t.patient_id,
      doctor_id: t.doctor_id || '',
      treatment_date: t.treatment_date,
      tooth_number: t.tooth_number || '',
      procedure_name: isCustom ? 'custom' : t.procedure_name,
      custom_procedure: isCustom ? t.procedure_name : '',
      cost: Number(t.cost) || 0,
      status: t.status,
      notes: t.notes || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_id) {
      setError('Please select a patient');
      return;
    }
    const procName =
      form.procedure_name === 'custom' ? form.custom_procedure.trim() : form.procedure_name;
    if (!procName) {
      setError('Please specify the procedure name');
      return;
    }

    setSaving(true);
    setError('');

    const isValidUuid = (val?: string | null) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const doctorIdToUse = isDemoMode()
      ? (form.doctor_id || null)
      : (isValidUuid(form.doctor_id) ? form.doctor_id : null);

    try {
      await saveTreatment({
        id: editingTreatment?.id,
        patient_id: form.patient_id,
        doctor_id: doctorIdToUse,
        treatment_date: form.treatment_date,
        tooth_number: form.tooth_number.trim() || null,
        procedure_name: procName,
        cost: Number(form.cost) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      const updated = await getTreatments();
      setTreatments(updated);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save treatment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this treatment record?')) return;
    await deleteTreatment(id);
    const updated = await getTreatments();
    setTreatments(updated);
  }

  const filteredTreatments = treatments.filter((t) => {
    const pName = t.patient?.name || '';
    const matchSearch =
      !search ||
      pName.toLowerCase().includes(search.toLowerCase()) ||
      t.procedure_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.tooth_number || '').includes(search);

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <CheckCircle2 className="text-emerald-700" size={26} />
            Dental Treatments & Procedures
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage treatment plans, root canals, restorations, crowns, implants, and billing
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-xs"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={16} /> Plan New Treatment
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search treatments by patient, tooth #, or procedure..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <span className="text-gray-400 text-[11px] font-medium mr-1">Status:</span>
          {(['all', 'planned', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Treatments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Tooth #</th>
                <th className="py-3.5 px-4">Procedure</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Doctor</th>
                <th className="py-3.5 px-4">Cost (Rs.)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading treatments...
                  </td>
                </tr>
              ) : filteredTreatments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No treatment records found matching criteria
                  </td>
                </tr>
              ) : (
                filteredTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 text-sm">{t.patient?.name || 'Patient'}</div>
                      <div className="text-[11px] text-gray-400">{t.patient?.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.tooth_number ? (
                        <span className="font-bold text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                          #{t.tooth_number}
                        </span>
                      ) : (
                        <span className="text-gray-400">General</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{t.procedure_name}</div>
                      {t.notes && <div className="text-[11px] text-gray-500 line-clamp-1">{t.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{t.treatment_date}</td>
                    <td className="py-3.5 px-4 text-gray-600">{t.doctor?.name || 'Dr. Attending'}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      Rs. {Number(t.cost).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'planned'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewPatientDossier && (
                          <button
                            onClick={() => onViewPatientDossier(t.patient_id)}
                            title="Open Patient Record Dossier"
                            className="p-1.5 rounded-lg bg-slate-100 text-gray-700 hover:bg-slate-200 text-xs font-semibold px-2"
                          >
                            Dossier
                          </button>
                        )}
                        {onNewInvoice && (
                          <button
                            onClick={() => onNewInvoice(t.patient_id, t.procedure_name, Number(t.cost))}
                            title="Generate Invoice for this Treatment"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                          >
                            <FileText size={13} /> Bill
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(t)}
                          title="Edit Treatment"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          title="Delete Treatment"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
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

      {/* Add / Edit Treatment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-900">
                {editingTreatment ? 'Edit Dental Treatment' : 'Plan New Dental Treatment'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Patient *
                </label>
                <select
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tooth Number (e.g., 44, 16, or General)
                  </label>
                  <input
                    type="text"
                    value={form.tooth_number}
                    onChange={(e) => setForm({ ...form, tooth_number: e.target.value })}
                    placeholder="e.g. 44"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Treatment Date
                  </label>
                  <input
                    type="date"
                    value={form.treatment_date}
                    onChange={(e) => setForm({ ...form, treatment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Procedure *
                </label>
                <select
                  value={form.procedure_name}
                  onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                >
                  <option value="">-- Select Procedure --</option>
                  {proceduresList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Procedure...</option>
                </select>

                {form.procedure_name === 'custom' && (
                  <input
                    type="text"
                    required
                    value={form.custom_procedure}
                    onChange={(e) => setForm({ ...form, custom_procedure: e.target.value })}
                    placeholder="Enter custom procedure name..."
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Cost / Fee (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TreatmentStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-medium"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Attending Doctor
                </label>
                <select
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || 'Doctor'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinical Notes & Observations
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Material used, anesthesia dosage, patient tolerances, follow-up..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
                >
                  {saving ? 'Saving...' : editingTreatment ? 'Update Treatment' : 'Save Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
