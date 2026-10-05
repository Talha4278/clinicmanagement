import { Printer, X, Stethoscope, Calendar, Phone } from 'lucide-react';
import { Prescription } from '../lib/types';
import { useClinicSettings } from '../lib/clinicSettings';

interface PrescriptionSlipProps {
  prescription: Prescription;
  onClose?: () => void;
}

export default function PrescriptionSlip({ prescription, onClose }: PrescriptionSlipProps) {
  const { settings: clinic } = useClinicSettings();
  const patient = prescription.patient;
  const doctor = prescription.doctor;

  function calculateAge(dob: string | null | undefined) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs no-print" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-gray-200 z-10 flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)]">
        {/* Top Action Toolbar (fixed/sticky at top, hidden during print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900 text-white no-print flex-shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">Clinical Prescription Slip</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs hover:shadow"
            >
              <Printer size={14} /> Print Prescription
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Prescription Paper Sheet (Scrollable container) */}
        <div className="p-6 sm:p-10 space-y-6 bg-white text-gray-900 overflow-y-auto flex-1" id="printable-prescription">
          {/* Clinic Header */}
          <div className="flex items-start justify-between border-b-2 border-emerald-800/80 pb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
                style={{ background: '#3c5e27' }}
              >
                {clinic.logo_url ? (
                  <img src={clinic.logo_url} alt={clinic.clinic_name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Stethoscope size={24} />
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">
                  {clinic.clinic_name || 'Dentivista'}
                </h2>
                {clinic.tagline && (
                  <p className="text-xs uppercase font-semibold text-emerald-800 tracking-wider">
                    {clinic.tagline}
                  </p>
                )}
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {clinic.address} {clinic.phone ? `· Contact: ${clinic.phone}` : ''} {clinic.email ? `· ${clinic.email}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{doctor?.name || 'Dr. Attending Dentist'}</p>
              <p className="text-xs text-emerald-700 font-medium">{doctor?.specialization || 'Dental Surgeon & Aesthetician'}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">PMDC / License Reg. #8921-D</p>
            </div>
          </div>

          {/* Patient Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Patient Name</span>
              <span className="font-bold text-gray-900 text-sm">{patient?.name || 'Patient'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Age / Gender</span>
              <span className="font-semibold text-gray-800">
                {calculateAge(patient?.date_of_birth) ? `${calculateAge(patient?.date_of_birth)} Yrs` : '—'} /{' '}
                {patient?.gender || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Contact</span>
              <span className="font-medium text-gray-800 flex items-center gap-1">
                <Phone size={11} className="text-gray-400" /> {patient?.phone || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Date</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                <Calendar size={11} className="text-gray-400" />
                {new Date(prescription.prescription_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Allergies Alert if present */}
          {patient?.allergies && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700 font-medium">
              <span className="font-bold uppercase tracking-wider text-[10px]">Known Allergies:</span>{' '}
              {patient.allergies}
            </div>
          )}

          {/* Diagnosis & Clinical Findings */}
          {prescription.diagnosis && (
            <div className="border-b border-gray-100 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Diagnosis:</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{prescription.diagnosis}</p>
            </div>
          )}

          {/* Rx Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-emerald-800 italic">℞</span>
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Prescribed Medications
              </span>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Medicine & Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prescription.items && prescription.items.length > 0 ? (
                    prescription.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-semibold text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900 text-sm">{item.medicine_name}</p>
                          <p className="text-xs text-emerald-700 font-medium">{item.dosage}</p>
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-700">{item.frequency}</td>
                        <td className="py-3 px-3 font-semibold text-gray-800">{item.duration}</td>
                        <td className="py-3 px-3 text-gray-600 italic">{item.instructions || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        No medications listed
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advice & Special Instructions */}
          {prescription.advice && (
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/70 text-xs">
              <p className="font-bold text-amber-900 uppercase tracking-wider text-[10px] mb-1">
                Clinical Advice & Special Precautions:
              </p>
              <p className="text-amber-900/90 whitespace-pre-line leading-relaxed">{prescription.advice}</p>
            </div>
          )}

          {/* Follow-up & Footer */}
          <div className="pt-6 border-t border-gray-200 flex items-end justify-between">
            <div className="text-xs">
              {prescription.follow_up_date && (
                <p className="font-semibold text-gray-800">
                  Next Follow-up Visit:{' '}
                  <span className="text-emerald-700 font-bold">
                    {new Date(prescription.follow_up_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Please bring this prescription slip on your next visit. In case of emergency or severe adverse reactions, contact the clinic immediately.
              </p>
            </div>

            <div className="text-center min-w-[140px]">
              <div className="h-12 border-b border-gray-400 border-dashed mb-1" />
              <p className="text-xs font-bold text-gray-800">Doctor's Signature</p>
              <p className="text-[10px] text-gray-400">{clinic.clinic_name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
