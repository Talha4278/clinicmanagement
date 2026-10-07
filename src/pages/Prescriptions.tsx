import React, { useEffect, useState } from 'react';
import {
  Pill, Plus, Search, Calendar, User,
  FileText, Printer, Trash2, X, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Prescription, PrescriptionItem, Patient, Staff } from '../lib/types';
import { getPrescriptions, savePrescription, deletePrescription } from '../lib/clinicStorage';
import PrescriptionSlip from '../components/PrescriptionSlip';
import { isDemoMode, getDemoPatients, getDemoStaff } from '../lib/demoData';
import { useAuth } from '../contexts/AuthContext';
import { applyClinicFilter, isMissingClinicIdColumnError } from '../lib/tenancyQuery';

interface Props {
  preselectedPatientId?: string | null;
  onViewPatientDossier?: (patientId: string) => void;
}

const COMMON_MEDICATIONS = [
  { name: 'Augmentin 625mg', dosage: '1 Tablet', freq: 'BD (Twice daily)', dur: '5 days', inst: 'After meals' },
  { name: 'Amoxicillin 500mg', dosage: '1 Capsule', freq: 'TDS (Three times daily)', dur: '5 days', inst: 'After food' },
  { name: 'Metronidazole 400mg', dosage: '1 Tablet', freq: 'TDS (Three times daily)', dur: '5 days', inst: 'With food, no alcohol' },
  { name: 'Ibuprofen 400mg', dosage: '1 Tablet', freq: 'TDS (Three times daily)', dur: '3 days', inst: 'After meals (Pain/Inflammation)' },
  { name: 'Paracetamol 500mg', dosage: '1 Tablet', freq: 'SOS (As needed)', dur: '3 days', inst: 'Every 6 hours if pain' },
  { name: 'Ketorolac Tromethamine 10mg', dosage: '1 Tablet', freq: 'BD (Twice daily)', dur: '3 days', inst: 'After meals for acute pain' },
  { name: 'Chlorhexidine Gluconate 0.2% Rinse', dosage: '10 ml', freq: 'BD (Twice daily)', dur: '7 days', inst: 'Rinse for 1 min after brushing' },
  { name: 'Warm Saline Gargles', dosage: 'Half tsp salt in warm water', freq: 'TDS (3-4 times daily)', dur: '5 days', inst: 'Gargle after eating' },
];

export default function Prescriptions({
  preselectedPatientId,
  onViewPatientDossier,
}: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Prescription Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [rxDate, setRxDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medItems, setMedItems] = useState<Omit<PrescriptionItem, 'id' | 'prescription_id'>[]>([
    {
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: '',
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Slip preview modal
  const [previewRx, setPreviewRx] = useState<Prescription | null>(null);

  const { staff: currentStaff, activeClinic } = useAuth();

  useEffect(() => {
    loadData();
  }, [activeClinic?.id]);

  async function loadData() {
    setLoading(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    if (isDemoMode()) {
      const rxs = await getPrescriptions(undefined, clinicId);
      const demoPats = getDemoPatients();
      const demoDocs = getDemoStaff().filter((s) => s.role === 'doctor' && s.active !== false);
      setPrescriptions(rxs);
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

    let [rxs, patRes, docRes] = await Promise.all([
      getPrescriptions(undefined, clinicId),
      applyClinicFilter(supabase.from('patients').select('*'), clinicId).order('name'),
      applyClinicFilter(supabase.from('staff').select('*').eq('role', 'doctor').eq('active', true), clinicId),
    ]);

    if (patRes.error && isMissingClinicIdColumnError(patRes.error)) {
      patRes = await supabase.from('patients').select('*').order('name');
    }
    if (docRes.error && isMissingClinicIdColumnError(docRes.error)) {
      docRes = await supabase.from('staff').select('*').eq('role', 'doctor').eq('active', true);
    }

    setPrescriptions(rxs);
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
    setSelectedPatientId(patientId || (patients.length > 0 ? patients[0].id : ''));
    setSelectedDoctorId(doctors.length > 0 ? doctors[0].id : '');
    setRxDate(new Date().toISOString().split('T')[0]);
    setDiagnosis('');
    setAdvice('');
    setFollowUpDate('');
    setMedItems([
      {
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: '',
      },
    ]);
    setError('');
    setShowModal(true);
  }

  function addMedicationRow(preset?: typeof COMMON_MEDICATIONS[0]) {
    setMedItems([
      ...medItems,
      preset
        ? {
            medicine_name: preset.name,
            dosage: preset.dosage,
            frequency: preset.freq,
            duration: preset.dur,
            instructions: preset.inst,
            quantity: '',
          }
        : {
            medicine_name: '',
            dosage: '1 Tablet',
            frequency: 'BD (Twice daily)',
            duration: '5 days',
            instructions: 'After meals',
            quantity: '',
          },
    ]);
  }

  function removeMedicationRow(idx: number) {
    setMedItems(medItems.filter((_, i) => i !== idx));
  }

  function updateMedItem(idx: number, field: string, val: string) {
    const next = [...medItems];
    next[idx] = { ...next[idx], [field]: val };
    setMedItems(next);
  }

  async function handleSavePrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a patient');
      return;
    }
    if (medItems.length === 0 || !medItems[0].medicine_name.trim()) {
      setError('Please add at least one medication');
      return;
    }

    setSaving(true);
    setError('');
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    try {
      const saved = await savePrescription(
        {
          clinic_id: clinicId,
          patient_id: selectedPatientId,
          doctor_id: selectedDoctorId || null,
          prescription_date: rxDate,
          diagnosis: diagnosis.trim() || null,
          advice: advice.trim() || null,
          follow_up_date: followUpDate || null,
        },
        medItems.filter((m) => m.medicine_name.trim().length > 0),
        clinicId
      );

      const updated = await getPrescriptions(undefined, clinicId);
      setPrescriptions(updated);
      setShowModal(false);

      // Open print preview automatically
      const patientMatch = patients.find((p) => p.id === selectedPatientId);
      const doctorMatch = doctors.find((d) => d.id === selectedDoctorId);
      setPreviewRx({
        ...saved,
        patient: patientMatch,
        doctor: doctorMatch,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    await deletePrescription(id, clinicId);
    const updated = await getPrescriptions(undefined, clinicId);
    setPrescriptions(updated);
  }

  const filtered = prescriptions.filter((rx) => {
    const pName = rx.patient?.name || '';
    const matchSearch =
      !search ||
      pName.toLowerCase().includes(search.toLowerCase()) ||
      (rx.diagnosis || '').toLowerCase().includes(search.toLowerCase()) ||
      (rx.items || []).some((i) => i.medicine_name.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Pill className="text-emerald-700" size={26} />
            Patient Prescriptions
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Prescribe dental medications, antibiotics, analgesics, mouth rinses, and print official Rx slips
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-xs"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={16} /> Write New Prescription
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prescriptions by patient name, medication, or diagnosis..."
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
      </div>

      {/* Prescriptions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full bg-white p-12 rounded-2xl text-center text-gray-400 text-xs border border-gray-100">
            Loading prescriptions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl text-center text-gray-400 text-xs border border-gray-100">
            No prescriptions found matching criteria
          </div>
        ) : (
          filtered.map((rx) => {
            const patient = rx.patient || patients.find((p) => p.id === rx.patient_id);
            const doctor = rx.doctor || doctors.find((d) => d.id === rx.doctor_id);
            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 card-shadow flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-emerald-700" />
                        <h4 className="font-bold text-gray-900 text-sm">{patient?.name || 'Patient'}</h4>
                      </div>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> {rx.prescription_date} · {doctor?.name || 'Dr. Attending'}
                      </p>
                    </div>

                    <span className="font-display font-bold text-xl text-emerald-800 italic">℞</span>
                  </div>

                  {rx.diagnosis && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-2.5 border border-gray-100 text-xs">
                      <span className="font-semibold text-gray-900">Diagnosis:</span>{' '}
                      <span className="text-gray-700">{rx.diagnosis}</span>
                    </div>
                  )}

                  {/* Medications list */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Medications ({rx.items?.length || 0}):
                    </span>
                    {(rx.items || []).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-xs bg-slate-50/70 p-2 rounded-lg flex items-center justify-between">
                        <span className="font-semibold text-gray-800">{item.medicine_name}</span>
                        <span className="text-emerald-700 font-medium text-[11px]">{item.dosage}</span>
                      </div>
                    ))}
                    {(rx.items?.length || 0) > 3 && (
                      <span className="text-[11px] text-gray-400 italic block">
                        + {rx.items!.length - 3} more medications
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {onViewPatientDossier && rx.patient_id && (
                      <button
                        onClick={() => onViewPatientDossier(rx.patient_id)}
                        className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"
                      >
                        <FileText size={12} /> Dossier
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rx.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium p-1"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => setPreviewRx({ ...rx, patient, doctor })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Printer size={13} /> Print Prescription
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Prescription Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-gray-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Pill size={18} />
                </div>
                <h3 className="font-semibold text-base text-gray-900">Issue Medical Prescription</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Patient, Doctor, Date Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Select Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Prescribing Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || 'Doctor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={rxDate}
                    onChange={(e) => setRxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Diagnosis / Reason
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute apical periodontitis, post-extraction pain, pericoronitis..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1.5">
                  Quick Add Frequent Dental Medications:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MEDICATIONS.map((med) => (
                    <button
                      key={med.name}
                      type="button"
                      onClick={() => addMedicationRow(med)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200 transition-colors"
                    >
                      + {med.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medications Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-900 uppercase">
                    Prescribed Medications
                  </label>
                  <button
                    type="button"
                    onClick={() => addMedicationRow()}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Medicine Row
                  </button>
                </div>

                <div className="space-y-2">
                  {medItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Medicine Name (e.g. Augmentin)"
                          value={item.medicine_name}
                          onChange={(e) => updateMedItem(idx, 'medicine_name', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Dosage (500mg)"
                          value={item.dosage}
                          onChange={(e) => updateMedItem(idx, 'dosage', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-800"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Frequency (BD / TDS)"
                          value={item.frequency}
                          onChange={(e) => updateMedItem(idx, 'frequency', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-800"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Duration (5 days)"
                          value={item.duration}
                          onChange={(e) => updateMedItem(idx, 'duration', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-800"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Instructions (After meals)"
                          value={item.instructions}
                          onChange={(e) => updateMedItem(idx, 'instructions', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-800"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeMedicationRow(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice & Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Special Advice & Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    placeholder="Warm saline gargles, soft diet, avoid hot drinks..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
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
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
                >
                  {saving ? 'Generating...' : 'Save & Print Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip Modal Preview */}
      {previewRx && (
        <PrescriptionSlip prescription={previewRx} onClose={() => setPreviewRx(null)} />
      )}
    </div>
  );
}
