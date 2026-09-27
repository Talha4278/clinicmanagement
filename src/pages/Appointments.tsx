import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Clock, Plus, Search, X,
  AlertCircle, Stethoscope, FileText, CheckCircle2,
  XCircle, UserCheck, CalendarDays, Edit2, MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentStatus, Patient, Staff } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useClinicSettings } from '../lib/clinicSettings';
import { generateAppointmentWhatsAppMessage, formatFriendlyDate } from '../lib/whatsapp';
import WhatsAppModal, { WhatsAppModalProps } from '../components/WhatsAppModal';
import ClockTimePicker from '../components/ClockTimePicker';
import {
  isDemoMode,
  getDemoAppointments,
  saveDemoAppointment,
  updateDemoAppointmentStatus,
  getDemoPatients,
  DEMO_STAFF_MEMBERS,
} from '../lib/demoData';

interface Props {
  onNewInvoiceForPatient?: (patientId: string) => void;
  preselectedPatientId?: string | null;
}

const statusColors: Record<AppointmentStatus, { bg: string; text: string; border: string }> = {
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  no_show: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const commonProcedures = [
  'General Consultation',
  'Scaling & Polishing',
  'Teeth Whitening',
  'Root Canal Treatment',
  'Dental Fillings',
  'Crown & Bridge',
  'Tooth Extraction',
  'Orthodontic Checkup',
  'Facial Aesthetics / Botox',
];

export default function Appointments({ onNewInvoiceForPatient, preselectedPatientId }: Props) {
  const { staff } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

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

  function handleOpenWhatsApp(apt: Appointment) {
    const patientName = apt.patient?.name || 'Valued Patient';
    const patientPhone = apt.patient?.phone || '';
    const doctorName = apt.doctor?.name;
    const proc = apt.procedure || 'Dental Checkup';
    const status = (apt.status as 'scheduled' | 'completed' | 'no_show' | 'cancelled') || 'scheduled';

    let title = 'WhatsApp Appointment Reminder';
    if (status === 'completed') {
      title = 'Post-Treatment Follow-up Care';
    } else if (status === 'no_show' || status === 'cancelled') {
      title = 'Reschedule Appointment Invitation';
    }

    const message = generateAppointmentWhatsAppMessage(status, {
      patientName,
      phone: patientPhone,
      procedure: proc,
      date: apt.appointment_date,
      time: apt.appointment_time,
      doctorName,
      clinicSettings: clinic,
    });

    setWhatsappModal({
      isOpen: true,
      title,
      patientName,
      patientPhone,
      message,
      metadata: {
        procedure: proc,
        date: formatFriendlyDate(apt.appointment_date),
        time: apt.appointment_time,
        doctorName: doctorName ? `Dr. ${doctorName}` : undefined,
        statusBadge: apt.status,
      },
    });
  }

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  // Booking Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [procedure, setProcedure] = useState(commonProcedures[0]);
  const [customProcedure, setCustomProcedure] = useState('');
  const [notes, setNotes] = useState('');
  const [modalStatus, setModalStatus] = useState<AppointmentStatus>('scheduled');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setAppointments(getDemoAppointments());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patient:patients(*), doctor:staff!appointments_doctor_id_fkey(*)')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    }
    setLoading(false);
  }, []);

  const fetchPatients = useCallback(async () => {
    if (isDemoMode()) {
      setPatients(getDemoPatients());
      return;
    }
    const { data } = await supabase.from('patients').select('*').order('name');
    setPatients(data ?? []);
  }, []);

  const fetchDoctors = useCallback(async () => {
    if (isDemoMode()) {
      setDoctors(DEMO_STAFF_MEMBERS.filter(s => s.role === 'doctor'));
      return;
    }
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('role', 'doctor')
      .eq('active', true)
      .order('name');
    setDoctors(data ?? []);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [fetchAppointments, fetchPatients, fetchDoctors]);

  // Handle preselected patient if passed
  useEffect(() => {
    if (preselectedPatientId && patients.length > 0) {
      const match = patients.find(p => p.id === preselectedPatientId);
      if (match) {
        setSelectedPatient(match);
        openNewModal(match);
      }
    }
  }, [preselectedPatientId, patients]);

  function openNewModal(patient?: Patient) {
    setEditingAppointment(null);
    if (patient) {
      setSelectedPatient(patient);
      setPatientSearch(patient.name);
    } else {
      setSelectedPatient(null);
      setPatientSearch('');
    }
    // Default doctor if logged in as doctor
    if (staff?.role === 'doctor') {
      setSelectedDoctor(staff.id);
    } else if (doctors.length > 0) {
      setSelectedDoctor(doctors[0].id);
    } else {
      setSelectedDoctor('');
    }
    setAppointmentDate(new Date().toISOString().split('T')[0]);
    setAppointmentTime('10:00');
    setProcedure(commonProcedures[0]);
    setCustomProcedure('');
    setNotes('');
    setModalStatus('scheduled');
    setError('');
    setShowModal(true);
  }

  function openEditModal(apt: Appointment) {
    setEditingAppointment(apt);
    if (apt.patient) {
      setSelectedPatient(apt.patient);
      setPatientSearch(apt.patient.name);
    } else {
      setSelectedPatient(null);
      setPatientSearch('');
    }
    setSelectedDoctor(apt.doctor_id || '');
    setAppointmentDate(apt.appointment_date);
    setAppointmentTime(apt.appointment_time);
    if (commonProcedures.includes(apt.procedure || '')) {
      setProcedure(apt.procedure || commonProcedures[0]);
      setCustomProcedure('');
    } else {
      setProcedure('other');
      setCustomProcedure(apt.procedure || '');
    }
    setNotes(apt.notes || '');
    setModalStatus(apt.status);
    setError('');
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a registered patient from the list.');
      return;
    }
    if (!appointmentDate) {
      setError('Please select an appointment date.');
      return;
    }
    if (!appointmentTime) {
      setError('Please select an appointment time.');
      return;
    }

    setSaving(true);
    setError('');

    const finalProcedure = procedure === 'other' ? customProcedure.trim() : procedure;

    const payload = {
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor || null,
      created_by: staff?.id ?? null,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      procedure: finalProcedure || null,
      notes: notes.trim() || null,
      status: modalStatus,
    };

    if (isDemoMode()) {
      saveDemoAppointment({
        id: editingAppointment?.id,
        ...payload,
      });
      await fetchAppointments();
      setShowModal(false);
      setSaving(false);
      return;
    }

    if (editingAppointment) {
      const { error: err } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', editingAppointment.id);

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from('appointments').insert(payload);

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }

    await fetchAppointments();
    setShowModal(false);
    setSaving(false);
  }

  async function updateStatus(aptId: string, newStatus: AppointmentStatus) {
    if (isDemoMode()) {
      updateDemoAppointmentStatus(aptId, newStatus);
      setAppointments(prev =>
        prev.map(a => (a.id === aptId ? { ...a, status: newStatus } : a))
      );
      return;
    }

    const { error: err } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', aptId);

    if (!err) {
      setAppointments(prev =>
        prev.map(a => (a.id === aptId ? { ...a, status: newStatus } : a))
      );
    }
  }

  // Filtered patients for dropdown
  const filteredPatientsDropdown = patients.filter(
    p =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  // Filtered appointments list
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter(apt => {
    // Search
    const patName = apt.patient?.name.toLowerCase() || '';
    const patPhone = apt.patient?.phone || '';
    const docName = apt.doctor?.name.toLowerCase() || '';
    const proc = apt.procedure?.toLowerCase() || '';
    const matchesSearch =
      patName.includes(search.toLowerCase()) ||
      patPhone.includes(search) ||
      docName.includes(search.toLowerCase()) ||
      proc.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;

    // Doctor filter
    if (doctorFilter !== 'all' && apt.doctor_id !== doctorFilter) return false;

    // Date filter
    if (dateFilter === 'today') {
      return apt.appointment_date === todayStr;
    } else if (dateFilter === 'upcoming') {
      return apt.appointment_date >= todayStr && apt.status === 'scheduled';
    } else if (dateFilter === 'past') {
      return apt.appointment_date < todayStr || apt.status === 'completed';
    } else if (dateFilter === 'custom' && customDate) {
      return apt.appointment_date === customDate;
    }

    return true;
  });

  // Calculate statistics
  const todayCount = appointments.filter(a => a.appointment_date === todayStr).length;
  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900">Appointments Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule and manage patient consultations and clinical appointments
          </p>
        </div>
        <button
          onClick={() => openNewModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 shadow-sm"
          style={{ background: '#3c5e27' }}
        >
          <Plus size={18} /> Book Appointment
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 flex-shrink-0">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
            <p className="text-xs text-gray-500 font-medium">Today's Appointments</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 flex-shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{scheduledCount}</p>
            <p className="text-xs text-gray-500 font-medium">Scheduled / Upcoming</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 flex-shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-500 font-medium">Completed Visits</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 text-red-600 flex-shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{cancelledCount}</p>
            <p className="text-xs text-gray-500 font-medium">Cancelled / No-Show</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl card-shadow space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by patient name, phone, doctor or procedure..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {(['all', 'today', 'upcoming', 'past'] as const).map(df => (
            <button
              key={df}
              onClick={() => {
                setDateFilter(df);
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${dateFilter === df
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {df}
            </button>
          ))}

          {/* Custom date input */}
          <input
            type="date"
            value={customDate}
            onChange={e => {
              setCustomDate(e.target.value);
              setDateFilter('custom');
            }}
            className={`px-2 py-1 rounded-lg border text-xs font-medium focus:ring-2 focus:ring-green-600/20 ${dateFilter === 'custom'
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}
          />
        </div>

        {/* Doctor & Status Dropdowns */}
        <div className="flex items-center gap-2">
          <select
            value={doctorFilter}
            onChange={e => setDoctorFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-green-600/20"
          >
            <option value="all">All Doctors</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                Dr. {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-green-600/20"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">
                  Patient
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">
                  Date & Time
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5 hidden md:table-cell">
                  Procedure / Reason
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5 hidden sm:table-cell">
                  Doctor
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">
                  Status
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Loading appointments...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-gray-400 text-sm">No appointments found matching filters</p>
                    <button
                      onClick={() => openNewModal()}
                      className="mt-3 text-sm font-medium hover:underline"
                      style={{ color: '#3c5e27' }}
                    >
                      Book a new appointment
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(apt => (
                  <tr key={apt.id} className="table-row-hover">
                    {/* Patient */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#3c5e27' }}
                        >
                          {apt.patient?.name.charAt(0).toUpperCase() ?? 'P'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{apt.patient?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{apt.patient?.phone ?? '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                          <CalendarIcon size={13} className="text-gray-400" />
                          {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400" />
                          {apt.appointment_time}
                        </p>
                      </div>
                    </td>

                    {/* Procedure */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-800 font-medium">{apt.procedure || 'General Checkup'}</p>
                      {apt.notes && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{apt.notes}</p>
                      )}
                    </td>

                    {/* Doctor */}
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {apt.doctor ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Stethoscope size={14} className="text-gray-400 flex-shrink-0" />
                          <span>Dr. {apt.doctor.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[apt.status].bg
                          } ${statusColors[apt.status].text} ${statusColors[apt.status].border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${apt.status === 'scheduled'
                              ? 'bg-blue-500'
                              : apt.status === 'completed'
                                ? 'bg-green-500'
                                : apt.status === 'cancelled'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                            }`}
                        />
                        {statusLabels[apt.status]}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {apt.status === 'scheduled' && (
                          <>
                            <button
                              title="Mark as Completed"
                              onClick={() => updateStatus(apt.id, 'completed')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              title="Cancel Appointment"
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {onNewInvoiceForPatient && apt.patient_id && (
                          <button
                            title="Generate Invoice"
                            onClick={() => onNewInvoiceForPatient(apt.patient_id)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <FileText size={16} />
                          </button>
                        )}

                        {/* WhatsApp Notification Button */}
                        <button
                          title={
                            apt.status === 'scheduled'
                              ? 'Send WhatsApp Reminder'
                              : apt.status === 'completed'
                              ? 'Send WhatsApp Post-Treatment Care Follow-up'
                              : 'Send WhatsApp Reschedule Request'
                          }
                          onClick={() => handleOpenWhatsApp(apt)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <MessageSquare size={16} />
                        </button>

                        <button
                          title="Edit Appointment"
                          onClick={() => openEditModal(apt)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Edit2 size={15} />
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

      {/* Book / Edit Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a registered patient and set scheduling details
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Patient Selection (searchable dropdown for registered patients) */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Registered Patient *
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    value={selectedPatient ? selectedPatient.name : patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setSelectedPatient(null);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Search registered patient by name or phone..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all bg-white"
                  />
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearch('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Dropdown list */}
                {showPatientDropdown && !selectedPatient && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                    {filteredPatientsDropdown.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No registered patients found</p>
                    ) : (
                      filteredPatientsDropdown.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch('');
                            setShowPatientDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: '#3c5e27' }}
                          >
                            {p.name.charAt(0).toUpperCase()}
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

                {/* Selected patient preview card */}
                {selectedPatient && (
                  <div className="mt-2.5 p-3 rounded-xl bg-green-50/70 border border-green-200/60 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedPatient.name}</p>
                      <p className="text-xs text-gray-600">Phone: {selectedPatient.phone}</p>
                      {selectedPatient.allergies && (
                        <p className="text-xs text-red-600 font-medium mt-0.5">
                          Allergies: {selectedPatient.allergies}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-lg">
                      Registered
                    </span>
                  </div>
                )}
              </div>

              {/* Doctor & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Attending Doctor
                  </label>
                  <select
                    value={selectedDoctor}
                    onChange={e => setSelectedDoctor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all bg-white"
                  >
                    <option value="">No Doctor Assigned</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={modalStatus}
                    onChange={e => setModalStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all bg-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Appointment Time *
                  </label>
                  <ClockTimePicker
                    value={appointmentTime}
                    onChange={setAppointmentTime}
                  />
                </div>
              </div>

              {/* Procedure / Treatment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Procedure / Treatment Reason
                </label>
                <select
                  value={procedure}
                  onChange={e => setProcedure(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all bg-white mb-2"
                >
                  {commonProcedures.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="other">Other / Custom Procedure...</option>
                </select>

                {procedure === 'other' && (
                  <input
                    type="text"
                    value={customProcedure}
                    onChange={e => setCustomProcedure(e.target.value)}
                    placeholder="Enter custom procedure name..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Clinical Notes / Special Requests
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any specific requirements or notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                  style={{ background: '#3c5e27' }}
                >
                  {saving ? 'Saving...' : editingAppointment ? 'Update Appointment' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder & Follow-Up Modal */}
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
