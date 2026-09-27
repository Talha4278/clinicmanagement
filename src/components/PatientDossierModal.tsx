import { useState, useEffect } from 'react';
import {
  X, Calendar, Stethoscope, FileText, Pill,
  User, Phone, Mail, MapPin, AlertCircle, Plus, Search,
  CheckCircle2, Clock, Eye, Printer, ShieldAlert, LucideIcon
} from 'lucide-react';
import {
  PatientActivityType,
  Prescription,
} from '../lib/types';
import { getPatientDossier, PatientDossierData } from '../lib/clinicStorage';
import DentalChart from './DentalChart';
import PrescriptionSlip from './PrescriptionSlip';

interface PatientDossierModalProps {
  patientId: string;
  onClose: () => void;
  onNavigatePage?: (page: string, extraId?: string) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

type TabType = 'overview' | 'appointments' | 'examinations' | 'treatments' | 'prescriptions' | 'invoices';

export default function PatientDossierModal({
  patientId,
  onClose,
  onNavigatePage,
  onViewInvoice,
}: PatientDossierModalProps) {
  const [data, setData] = useState<PatientDossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview Tab Timeline Filters
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<PatientActivityType | 'all'>('all');

  // Modal for previewing prescription slip
  const [viewPrescription, setViewPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    loadDossier();
  }, [patientId]);

  async function loadDossier() {
    setLoading(false);
    const dossier = await getPatientDossier(patientId);
    setData(dossier);
    setLoading(false);
  }

  function calculateAge(dob: string | null | undefined) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Loading Patient Records...</p>
        </div>
      </div>
    );
  }

  const { patient, appointments, examinations, treatments, prescriptions, invoices, timeline } = data;

  // Filtered timeline for Overview research
  const filteredTimeline = timeline.filter((event) => {
    const matchType = timelineTypeFilter === 'all' || event.type === timelineTypeFilter;
    const matchSearch =
      !timelineSearch ||
      event.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      (event.subtitle || '').toLowerCase().includes(timelineSearch.toLowerCase()) ||
      (event.details || '').toLowerCase().includes(timelineSearch.toLowerCase()) ||
      (event.doctorName || '').toLowerCase().includes(timelineSearch.toLowerCase());
    return matchType && matchSearch;
  });

  // Latest examination findings for dental chart tab
  const latestExam = examinations[0];
  const combinedTeethFindings = latestExam ? latestExam.teeth_findings : {};

  // Financial summary
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPending = invoices
    .filter((i) => i.payment_status !== 'paid')
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header & Patient Details */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-800 border-2 border-emerald-500/50 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                {patient.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight">
                    {patient.name}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-800/80 text-emerald-200 border border-emerald-700">
                    Patient ID #{patient.id.slice(0, 8)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/80 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium">
                    <User size={13} className="text-emerald-400" />
                    {calculateAge(patient.date_of_birth) ? `${calculateAge(patient.date_of_birth)} Yrs` : 'Age N/A'} ·{' '}
                    {patient.gender || 'Gender unassigned'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400" /> {patient.phone}
                  </span>
                  {patient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-emerald-400" /> {patient.email}
                    </span>
                  )}
                  {patient.address && (
                    <span className="flex items-center gap-1.5 hidden md:flex">
                      <MapPin size={13} className="text-emerald-400" /> {patient.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Alert Ribbons: Allergies & Medical History */}
          {(patient.allergies || patient.medical_history) && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2 text-xs">
              {patient.allergies && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-200 px-3 py-1 rounded-xl">
                  <ShieldAlert size={14} className="text-red-400" />
                  <span className="font-bold">Allergies:</span>
                  <span>{patient.allergies}</span>
                </div>
              )}
              {patient.medical_history && (
                <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3 py-1 rounded-xl">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span className="font-bold">Medical History:</span>
                  <span>{patient.medical_history}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onNavigatePage?.('appointments', patient.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Calendar size={13} /> Book Appointment
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigatePage?.('examinations', patient.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Stethoscope size={13} /> New Dental Exam
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigatePage?.('treatments', patient.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <CheckCircle2 size={13} /> Add Treatment
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigatePage?.('prescriptions', patient.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Pill size={13} /> Prescribe Medicine
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigatePage?.('new-invoice', patient.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <FileText size={13} /> Create Invoice
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 px-6 bg-gray-50 flex-shrink-0 overflow-x-auto gap-1">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            label="Overview"
            count={timeline.length}
            icon={Clock}
          />
          <TabButton
            active={activeTab === 'appointments'}
            onClick={() => setActiveTab('appointments')}
            label="Appointments"
            count={appointments.length}
            icon={Calendar}
          />
          <TabButton
            active={activeTab === 'examinations'}
            onClick={() => setActiveTab('examinations')}
            label="Dental Chart & Exam"
            count={examinations.length}
            icon={Stethoscope}
          />
          <TabButton
            active={activeTab === 'treatments'}
            onClick={() => setActiveTab('treatments')}
            label="Treatments & Procedures"
            count={treatments.length}
            icon={CheckCircle2}
          />
          <TabButton
            active={activeTab === 'prescriptions'}
            onClick={() => setActiveTab('prescriptions')}
            label="Prescriptions"
            count={prescriptions.length}
            icon={Pill}
          />
          <TabButton
            active={activeTab === 'invoices'}
            onClick={() => setActiveTab('invoices')}
            label="Invoices & Billing"
            count={invoices.length}
            icon={FileText}
          />
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* ─── TAB 1: RESEARCH & OVERVIEW CHRONOLOGICAL FEED ────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs text-gray-500 font-medium">Total Appointments</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{appointments.length}</p>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {appointments.filter((a) => a.status === 'scheduled').length} upcoming
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs text-gray-500 font-medium">Dental Chart Records</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{examinations.length}</p>
                  <span className="text-[11px] text-purple-600 font-medium">
                    {Object.keys(combinedTeethFindings).length} teeth charted
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs text-gray-500 font-medium">Treatments Performed</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{treatments.length}</p>
                  <span className="text-[11px] text-blue-600 font-medium">
                    {treatments.filter((t) => t.status === 'completed').length} completed
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow">
                  <span className="text-xs text-gray-500 font-medium">Billed / Outstanding</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">Rs. {totalBilled.toLocaleString()}</p>
                  <span className={`text-[11px] font-medium ${totalPending > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {totalPending > 0 ? `Rs. ${totalPending.toLocaleString()} pending` : 'All cleared'}
                  </span>
                </div>
              </div>

              {/* Research Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 card-shadow">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    placeholder="Search clinical notes, diagnosis, procedures across patient timeline..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-xs border-0 focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                  {timelineSearch && (
                    <button
                      onClick={() => setTimelineSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  <span className="text-gray-400 text-[11px] font-medium mr-1">Filter:</span>
                  {(['all', 'appointment', 'examination', 'treatment', 'prescription', 'invoice'] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setTimelineTypeFilter(type)}
                        className={`px-2.5 py-1.5 rounded-lg capitalize font-medium transition-all ${timelineTypeFilter === type
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                          }`}
                      >
                        {type === 'all' ? 'All Events' : type}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Chronological Timeline List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                  Unified Clinical & Operational History ({filteredTimeline.length} events)
                </h4>

                {filteredTimeline.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400 text-xs">
                    No clinical events matching criteria
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                    {filteredTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="relative bg-white rounded-2xl p-4 border border-gray-100 card-shadow hover:shadow-md transition-shadow"
                      >
                        {/* Dot indicator */}
                        <div
                          className="absolute -left-6 top-5 w-3 h-3 rounded-full border-2 border-white ring-2"
                          style={{
                            backgroundColor: item.badgeColor || '#059669',
                            boxShadow: `0 0 0 2px ${item.badgeColor || '#059669'}40`,
                          }}
                        />

                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: `${item.badgeColor || '#059669'}15`,
                                  color: item.badgeColor || '#059669',
                                }}
                              >
                                {item.type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(item.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              {item.status && (
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                  {item.status}
                                </span>
                              )}
                            </div>

                            <h5 className="text-sm font-semibold text-gray-900">{item.title}</h5>

                            {item.subtitle && (
                              <p className="text-xs text-emerald-700 font-medium">{item.subtitle}</p>
                            )}
                            {item.details && (
                              <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1.5 whitespace-pre-line leading-relaxed">
                                {item.details}
                              </p>
                            )}
                          </div>

                          {/* Quick view button if applicable */}
                          {item.type === 'prescription' && (
                            <button
                              onClick={() => setViewPrescription(item.rawRecord)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0"
                            >
                              <Printer size={12} /> View Slip
                            </button>
                          )}
                          {item.type === 'invoice' && onViewInvoice && (
                            <button
                              onClick={() => {
                                onClose();
                                onViewInvoice(item.rawRecord.id);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                            >
                              <Eye size={12} /> View Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: APPOINTMENTS ──────────────────────────────────────── */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  Patient Appointments ({appointments.length})
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage?.('appointments', patient.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} /> Schedule Appointment
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 text-gray-400 text-xs">
                  No appointments scheduled for this patient yet
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Procedure</th>
                        <th className="py-3 px-4">Doctor</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {appointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            <div>{apt.appointment_date}</div>
                            <div className="text-[11px] text-gray-400">{apt.appointment_time}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-800">
                            {apt.procedure || 'Clinical Consultation'}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">{apt.doctor?.name || 'Assigned Staff'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${apt.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : apt.status === 'scheduled'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">{apt.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: DENTAL EXAMINATION & CHART ────────────────────────── */}
          {activeTab === 'examinations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Patient Dental Chart & History</h4>
                  <p className="text-xs text-gray-500">
                    Comprehensive odontogram tracking of all 32 adult / 20 primary teeth findings
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage?.('examinations', patient.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} /> Full Examination Editor
                </button>
              </div>

              {/* Embedded Dental Chart */}
              <DentalChart
                dentitionType="adult"
                teethFindings={combinedTeethFindings}
                readOnly={true}
              />

              {/* Past Examination Sessions */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Past Examination Sessions ({examinations.length})
                </h5>
                {examinations.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-white p-4 rounded-xl border border-gray-100">
                    No examination sessions recorded yet.
                  </p>
                ) : (
                  examinations.map((exam) => (
                    <div key={exam.id} className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">
                          Exam Date: {exam.examination_date}
                        </span>
                        <span className="text-xs text-gray-500">{exam.doctor?.name || 'Dr. Attending'}</span>
                      </div>
                      {exam.chief_complaint && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Chief Complaint:</span> {exam.chief_complaint}
                        </p>
                      )}
                      {exam.clinical_notes && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                          {exam.clinical_notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 4: TREATMENTS ────────────────────────────────────────── */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  Treatments & Procedures ({treatments.length})
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage?.('treatments', patient.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} /> Add Treatment
                </button>
              </div>

              {treatments.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 text-gray-400 text-xs">
                  No treatments registered for this patient yet
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Tooth #</th>
                        <th className="py-3 px-4">Procedure</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Cost (Rs.)</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {treatments.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{t.treatment_date}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-800">
                            {t.tooth_number ? `#${t.tooth_number}` : 'Full Mouth'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-800">{t.procedure_name}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${t.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.status === 'in_progress'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            Rs. {Number(t.cost).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500">{t.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 5: PRESCRIPTIONS ─────────────────────────────────────── */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  Prescriptions Issued ({prescriptions.length})
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage?.('prescriptions', patient.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} /> New Prescription
                </button>
              </div>

              {prescriptions.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 text-gray-400 text-xs">
                  No prescriptions recorded for this patient
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="bg-white rounded-2xl p-5 border border-gray-100 card-shadow space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <span className="font-bold text-sm text-gray-900">
                            Prescription #{rx.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">Date: {rx.prescription_date}</span>
                        </div>
                        <button
                          onClick={() => setViewPrescription({ ...rx, patient })}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                        >
                          <Printer size={13} /> View / Print Prescription Slip
                        </button>
                      </div>

                      {rx.diagnosis && (
                        <p className="text-xs text-gray-700">
                          <span className="font-bold text-gray-900">Diagnosis:</span> {rx.diagnosis}
                        </p>
                      )}

                      {/* Medications list */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                          Medications Prescribed:
                        </span>
                        <div className="space-y-1.5">
                          {rx.items?.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <span className="font-bold text-gray-900">{item.medicine_name}</span>
                                <span className="text-emerald-700 font-medium ml-2">({item.dosage})</span>
                              </div>
                              <div className="text-gray-500">
                                <span>{item.frequency}</span> · <span>{item.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {rx.advice && (
                        <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg">
                          <span className="font-semibold">Advice:</span> {rx.advice}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 6: INVOICES & BILLING ────────────────────────────────── */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  Billing History & Invoices ({invoices.length})
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    onNavigatePage?.('new-invoice', patient.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} /> New Invoice
                </button>
              </div>

              {invoices.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 text-gray-400 text-xs">
                  No invoices generated for this patient yet
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-bold text-gray-900">{inv.invoice_number}</td>
                          <td className="py-3.5 px-4 text-gray-500">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-medium capitalize text-gray-700">
                            {inv.payment_method.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.payment_status === 'partial'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                              {inv.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            Rs. {Number(inv.total).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            {onViewInvoice && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onViewInvoice(inv.id);
                                }}
                                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                              >
                                <Eye size={13} /> View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prescription Print Modal preview if requested */}
      {viewPrescription && (
        <PrescriptionSlip
          prescription={viewPrescription}
          onClose={() => setViewPrescription(null)}
        />
      )}
    </div>
  );
}

// ─── TAB BUTTON HELPER ────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: LucideIcon;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${active
          ? 'border-emerald-700 text-emerald-800 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
        }`}
    >
      <Icon size={14} className={active ? 'text-emerald-700' : 'text-gray-400'} />
      <span>{label}</span>
      <span
        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
          }`}
      >
        {count}
      </span>
    </button>
  );
}
