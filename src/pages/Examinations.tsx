import { useEffect, useState } from 'react';
import {
  Stethoscope, Plus, Search, Calendar, User,
  FileText, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Examination,
  Patient,
  Staff,
  DentitionType,
  ToothCondition,
} from '../lib/types';
import { getExaminations, saveExamination } from '../lib/clinicStorage';
import DentalChart from '../components/DentalChart';
import { isDemoMode, getDemoPatients, getDemoStaff } from '../lib/demoData';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  preselectedPatientId?: string | null;
  onNavigateToTreatment?: (patientId: string, toothNum?: string, procedure?: string) => void;
  onViewPatientDossier?: (patientId: string) => void;
}

export default function Examinations({
  preselectedPatientId,
  onNavigateToTreatment,
  onViewPatientDossier,
}: Props) {
  const { staff: currentStaff, activeClinic } = useAuth();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Active / New Examination Form
  const [showEditor, setShowEditor] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [dentitionType, setDentitionType] = useState<DentitionType>('adult');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [gingivalCondition, setGingivalCondition] = useState<any>('Healthy');
  const [plaqueLevel, setPlaqueLevel] = useState<any>('Low');
  const [softTissueNotes, setSoftTissueNotes] = useState('');
  const [teethFindings, setTeethFindings] = useState<Record<number, ToothCondition>>({});
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Selected examination for view
  const [viewExam, setViewExam] = useState<Examination | null>(null);

  useEffect(() => {
    loadData();
  }, [activeClinic?.id]);

  async function loadData() {
    setLoading(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    if (isDemoMode()) {
      const exams = await getExaminations(undefined, clinicId);
      const demoPats = getDemoPatients();
      const demoDocs = getDemoStaff().filter((s) => s.role === 'doctor' && s.active !== false);
      setExaminations(exams);
      setPatients(demoPats);
      setDoctors(demoDocs);
      if (preselectedPatientId) {
        const match = demoPats.find((p) => p.id === preselectedPatientId);
        if (match) {
          openNewExam(match);
        }
      }
      setLoading(false);
      return;
    }

    const [exams, patientsRes, staffRes] = await Promise.all([
      getExaminations(undefined, clinicId),
      supabase.from('patients').select('*').eq('clinic_id', clinicId).order('name'),
      supabase.from('staff').select('*').eq('clinic_id', clinicId).eq('role', 'doctor').eq('active', true),
    ]);

    setExaminations(exams);
    setPatients(patientsRes.data || []);
    const availableDocs = (staffRes.data && staffRes.data.length > 0)
      ? staffRes.data
      : (currentStaff ? [currentStaff] : []);
    setDoctors(availableDocs);

    if (preselectedPatientId && patientsRes.data) {
      const match = patientsRes.data.find((p) => p.id === preselectedPatientId);
      if (match) {
        openNewExam(match);
      }
    }
    setLoading(false);
  }

  function openNewExam(p?: Patient) {
    setSelectedPatient(p || (patients.length > 0 ? patients[0] : null));
    setSelectedDoctorId(doctors.length > 0 ? doctors[0].id : '');
    setExamDate(new Date().toISOString().split('T')[0]);
    setDentitionType('adult');
    setChiefComplaint('');
    setGingivalCondition('Healthy');
    setPlaqueLevel('Low');
    setSoftTissueNotes('');
    setTeethFindings({});
    setClinicalNotes('');
    setTreatmentPlanNotes('');
    setError('');
    setShowEditor(true);
    setViewExam(null);
  }

  async function handleSaveExam(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setSaving(true);
    setError('');
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    try {
      const saved = await saveExamination({
        clinic_id: clinicId,
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctorId || null,
        examination_date: examDate,
        dentition_type: dentitionType,
        chief_complaint: chiefComplaint.trim() || null,
        gingival_condition: gingivalCondition,
        plaque_level: plaqueLevel,
        soft_tissue_notes: softTissueNotes.trim() || null,
        teeth_findings: teethFindings,
        clinical_notes: clinicalNotes.trim() || null,
        treatment_plan_notes: treatmentPlanNotes.trim() || null,
      }, clinicId);

      const updated = [saved, ...examinations.filter((ex) => ex.id !== saved.id)];
      setExaminations(updated);
      setShowEditor(false);
      setViewExam(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save examination record');
    } finally {
      setSaving(false);
    }
  }

  const filteredExams = examinations.filter((exam) => {
    const pName = exam.patient?.name || '';
    const matchSearch =
      !search ||
      pName.toLowerCase().includes(search.toLowerCase()) ||
      (exam.chief_complaint || '').toLowerCase().includes(search.toLowerCase()) ||
      (exam.clinical_notes || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Stethoscope className="text-emerald-700" size={26} />
            Dental Examination & Odontogram
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Adult (32 teeth) & Pediatric (20 teeth) charts, clinical dental findings, periodontal indices
          </p>
        </div>

        <button
          onClick={() => openNewExam()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-xs"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={16} /> New Clinical Examination
        </button>
      </div>

      {/* Editor Modal / Drawer */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowEditor(false)} />
          <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-gray-100 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Stethoscope size={18} />
                </div>
                <h3 className="font-semibold text-base text-gray-900">
                  New Dental Examination & Charting Session
                </h3>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Patient & Doctor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Select Patient *
                  </label>
                  <select
                    value={selectedPatient?.id || ''}
                    onChange={(e) => {
                      const found = patients.find((p) => p.id === e.target.value);
                      setSelectedPatient(found || null);
                    }}
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
                    Attending Doctor
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
                    Examination Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Chief Complaint / Reason for Consultation
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Toothache on lower right side, sensitivity to cold, routine checkup..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>

              {/* Interactive Dental Chart */}
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Interactive Tooth Chart & Clinical Findings
                </label>
                <DentalChart
                  dentitionType={dentitionType}
                  onChangeDentitionType={setDentitionType}
                  teethFindings={teethFindings}
                  onChangeTeethFindings={setTeethFindings}
                  onQuickTreatment={(toothNum, _toothName, suggestedProc) => {
                    if (selectedPatient && onNavigateToTreatment) {
                      setShowEditor(false);
                      onNavigateToTreatment(selectedPatient.id, String(toothNum), suggestedProc);
                    }
                  }}
                />
              </div>

              {/* Periodontal & Soft Tissue Indices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Gingival Condition
                  </label>
                  <select
                    value={gingivalCondition}
                    onChange={(e) => setGingivalCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  >
                    <option value="Healthy">Healthy (Pink, firm, no bleeding)</option>
                    <option value="Mild Gingivitis">Mild Gingivitis (Marginal erythema)</option>
                    <option value="Moderate Periodontitis">Moderate Periodontitis (Bleeding, 4-5mm pockets)</option>
                    <option value="Severe Periodontitis">Severe Periodontitis (&gt;6mm pockets, mobility)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Plaque / Calculus Level
                  </label>
                  <select
                    value={plaqueLevel}
                    onChange={(e) => setPlaqueLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  >
                    <option value="Low">Low / Minimal</option>
                    <option value="Moderate">Moderate Supragingival</option>
                    <option value="High">High / Heavy Subgingival Deposits</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Soft Tissue & Mucosa
                  </label>
                  <input
                    type="text"
                    value={softTissueNotes}
                    onChange={(e) => setSoftTissueNotes(e.target.value)}
                    placeholder="Normal buccal mucosa, tongue, palate"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              {/* Clinical Notes & Treatment Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Clinical Diagnosis & Observations
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Clinical test results (cold test, percussion, radiographic findings)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Proposed Treatment Plan
                  </label>
                  <textarea
                    rows={3}
                    value={treatmentPlanNotes}
                    onChange={(e) => setTreatmentPlanNotes(e.target.value)}
                    placeholder="1. Caries excavation #44, 2. Root Canal Preparation, 3. Composite filling #16..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
                >
                  {saving ? 'Saving Examination...' : 'Save Examination Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main View Grid: List on Left, Selected Details & Chart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Examinations History List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-gray-100 card-shadow">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, complaint..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs border-0 focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-400 text-xs border border-gray-100">
                Loading examination records...
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-400 text-xs border border-gray-100">
                No examination records found
              </div>
            ) : (
              filteredExams.map((exam) => {
                const isSelected = viewExam?.id === exam.id;
                const toothCount = Object.keys(exam.teeth_findings || {}).length;
                return (
                  <div
                    key={exam.id}
                    onClick={() => setViewExam(exam)}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer card-shadow hover:shadow-md ${
                      isSelected ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-emerald-700" />
                          <h4 className="font-bold text-gray-900 text-sm">
                            {exam.patient?.name || 'Patient'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar size={11} /> {exam.examination_date}
                        </p>
                      </div>

                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {toothCount} teeth charted
                      </span>
                    </div>

                    {exam.chief_complaint && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 italic">
                        "{exam.chief_complaint}"
                      </p>
                    )}

                    <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{exam.dentition_type === 'child' ? 'Pediatric' : 'Adult'} Dentition</span>
                      <span className="text-emerald-700 font-semibold flex items-center">
                        View Chart <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Examination Details & Chart */}
        <div className="lg:col-span-2">
          {viewExam ? (
            <div className="space-y-5">
              {/* Header card for selected exam */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                      Examination Details
                    </span>
                    <h3 className="font-display text-xl font-bold text-gray-900 mt-0.5">
                      {viewExam.patient?.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Examined on {viewExam.examination_date} · Doctor: {viewExam.doctor?.name || 'Attending Dentist'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onViewPatientDossier && viewExam.patient_id && (
                      <button
                        onClick={() => onViewPatientDossier(viewExam.patient_id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <FileText size={13} /> Open Patient Dossier
                      </button>
                    )}
                  </div>
                </div>

                {viewExam.chief_complaint && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-700">
                    <span className="font-bold text-gray-900">Chief Complaint:</span> {viewExam.chief_complaint}
                  </div>
                )}
              </div>

              {/* Dental Chart of Examined Findings */}
              <DentalChart
                dentitionType={viewExam.dentition_type}
                teethFindings={viewExam.teeth_findings || {}}
                readOnly={true}
              />

              {/* Clinical Notes & Treatment Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs font-bold uppercase text-gray-500 block mb-2">
                    Clinical Diagnosis & Tests
                  </span>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {viewExam.clinical_notes || 'No specific diagnostic remarks noted.'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs font-bold uppercase text-gray-500 block mb-2">
                    Treatment Plan & Recommendations
                  </span>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {viewExam.treatment_plan_notes || 'No treatment plan documented.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 card-shadow space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <Stethoscope size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Select an Examination</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Select an examination record from the list on the left to inspect the charted dental odontogram, tooth findings, and periodontal condition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
