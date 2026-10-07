import { useEffect, useState } from 'react';
import {
  Users, TrendingUp, Plus, ArrowRight, Calendar as CalendarIcon,
  Clock, ChevronLeft, ChevronRight, Stethoscope, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Appointment, Invoice, Patient } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useClinicSettings } from '../lib/clinicSettings';
import {
  isDemoMode,
  getDemoPatients,
  getDemoInvoices,
  getDemoAppointments,
} from '../lib/demoData';
import { formatFriendlyTime } from '../lib/whatsapp';

interface Props {
  onNavigate: (page: string, extraId?: string) => void;
  onViewPatientDossier?: (patientId: string) => void;
}

interface Stats {
  totalPatients: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingAmount: number;
  todayInvoices: number;
  upcomingAppointmentsCount: number;
}

function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Dashboard({ onNavigate, onViewPatientDossier }: Props) {
  const { staff, activeClinic } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const isReceptionist = staff?.role === 'receptionist';

  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    pendingAmount: 0,
    todayInvoices: 0,
    upcomingAppointmentsCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State for Upcoming Appointments: empty string means Show All Upcoming by default
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>('');

  const todayStr = getLocalDateStr(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  useEffect(() => {
    fetchData();
  }, [activeClinic?.id]);

  async function fetchData() {
    if (isDemoMode()) {
      const demoPatients = getDemoPatients();
      const demoInvoices = getDemoInvoices();
      const demoAppointments = getDemoAppointments();

      const paidInvoices = demoInvoices.filter(i => i.payment_status === 'paid');
      const todayPaid = paidInvoices.filter(i => (i.created_at || i.issue_date || '').startsWith(todayStr));
      const pendingInvoices = demoInvoices.filter(i => i.payment_status !== 'paid');

      const scheduledAppointments = demoAppointments.filter(a => a.status === 'scheduled');
      setStats({
        totalPatients: demoPatients.length,
        todayRevenue: todayPaid.reduce((s, i) => s + Number(i.total), 0),
        monthRevenue: paidInvoices.reduce((s, i) => s + Number(i.total), 0),
        pendingAmount: pendingInvoices.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount || 0)), 0),
        todayInvoices: demoInvoices.filter(i => (i.created_at || i.issue_date || '').startsWith(todayStr)).length,
        upcomingAppointmentsCount: scheduledAppointments.length,
      });

      setRecentInvoices(demoInvoices as Invoice[]);
      setRecentPatients(demoPatients);
      setUpcomingAppointments(scheduledAppointments);
      setLoading(false);
      return;
    }

    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [
      patientsRes,
      todayInvRes,
      monthInvRes,
      pendingRes,
      recentInvRes,
      recentPatRes,
      aptsRes,
    ] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
      supabase.from('invoices').select('total').eq('clinic_id', clinicId).gte('created_at', todayStr).eq('payment_status', 'paid'),
      supabase.from('invoices').select('total').eq('clinic_id', clinicId).gte('created_at', monthStart).eq('payment_status', 'paid'),
      supabase.from('invoices').select('total').eq('clinic_id', clinicId).in('payment_status', ['pending', 'partial']),
      supabase
        .from('invoices')
        .select('*, patient:patients(name,phone), doctor:staff!invoices_doctor_id_fkey(name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('patients').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5),
      supabase
        .from('appointments')
        .select('*, patient:patients(*), doctor:staff!appointments_doctor_id_fkey(*)')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', todayStr)
        .eq('status', 'scheduled')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(50),
    ]);

    let aptsData: Appointment[] = [];
    if (aptsRes.error) {
      console.warn('Dashboard appointments query with doctor fkey failed, attempting fallback:', aptsRes.error);
      const fallbackRes = await supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', todayStr)
        .eq('status', 'scheduled')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(50);
      aptsData = (fallbackRes.data as Appointment[]) ?? [];
    } else {
      aptsData = (aptsRes.data as Appointment[]) ?? [];
    }

    const todayCount = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', todayStr);

    const scheduledApts = aptsData.filter(a => a.status === 'scheduled');

    setStats({
      totalPatients: patientsRes.count ?? 0,
      todayRevenue: (todayInvRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      monthRevenue: (monthInvRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      pendingAmount: (pendingRes.data ?? []).reduce((s, i) => s + Number(i.total), 0),
      todayInvoices: todayCount.count ?? 0,
      upcomingAppointmentsCount: scheduledApts.length,
    });

    setRecentInvoices((recentInvRes.data as Invoice[]) ?? []);
    setRecentPatients((recentPatRes.data as Patient[]) ?? []);
    setUpcomingAppointments(scheduledApts);
    setLoading(false);
  }

  // Helper calendar calculations
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    setCalendarDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCalendarDate(new Date(year, month + 1, 1));
  }

  // Filter appointments to only scheduled visits for upcoming section
  const scheduledOnly = upcomingAppointments.filter((a) => a.status === 'scheduled');

  // Map dates to appointment counts for the dots
  const dateToAptCount: Record<string, number> = {};
  scheduledOnly.forEach((apt) => {
    dateToAptCount[apt.appointment_date] = (dateToAptCount[apt.appointment_date] || 0) + 1;
  });

  // Filter appointments for selected day or all upcoming if no selection
  const dayAppointments = selectedDayStr
    ? scheduledOnly.filter((a) => a.appointment_date === selectedDayStr)
    : scheduledOnly;

  const allStatCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients.toLocaleString(),
      icon: Users,
      color: '#3c5e27',
      bg: '#f2f7ef',
      sub: 'Registered patients',
    },
    {
      label: "Today's Revenue",
      value: `Rs. ${stats.todayRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: '#1d4ed8',
      bg: '#eff6ff',
      sub: `${stats.todayInvoices} invoices today`,
    },
    {
      label: 'Monthly Revenue',
      value: `Rs. ${stats.monthRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: '#047857',
      bg: '#ecfdf5',
      sub: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    },
    {
      label: 'Upcoming Appointments',
      value: `${stats.upcomingAppointmentsCount}`,
      icon: CalendarIcon,
      color: '#7c3aed',
      bg: '#f5f3ff',
      sub: 'Scheduled visits',
    },
  ];

  const statCards = isReceptionist
    ? allStatCards.filter((card) => card.label !== "Today's Revenue" && card.label !== 'Monthly Revenue')
    : allStatCards;

  const statusColors: Record<string, string> = {
    paid: 'badge-paid',
    pending: 'badge-pending',
    partial: 'badge-partial',
  };

  return (
    <div className="space-y-6">
      {/* Quick actions banner */}
      <div
        className="rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2a401d 0%, #3c5e27 60%, #4a7530 100%)' }}
      >
        <div>
          <span className="text-white/70 text-xs uppercase font-semibold tracking-wider">
            {clinic.clinic_name} Operations
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-white mt-1 font-bold">
            {clinic.tagline || 'Dental & Aesthetics Hub'}
          </h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xl">
            Streamline patient appointments, dental chart examinations, treatment plans, prescriptions, and stock inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          <button
            onClick={() => onNavigate('appointments')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <CalendarIcon size={16} /> Book Appointment
          </button>
          <button
            onClick={() => onNavigate('examinations')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Stethoscope size={16} /> Dental Chart
          </button>
          <button
            onClick={() => onNavigate('new-invoice')}
            className="flex items-center gap-2 bg-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-white/95 transition-all shadow-md"
            style={{ color: '#3c5e27' }}
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isReceptionist ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-4`}>
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 card-shadow border border-gray-100/80">
            <div className="flex items-start justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg }}
              >
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3">{loading ? '—' : card.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{card.label}</p>
            <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── UPCOMING APPOINTMENTS ON CALENDAR WITH TIME SECTION ─── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 card-shadow space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <CalendarIcon size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-display">
                Upcoming Appointments & Calendar Schedule
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Interactive appointment calendar showing scheduled visit times, patient records, and procedures
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDayStr('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !selectedDayStr
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Upcoming ({scheduledOnly.length})
            </button>
            <button
              onClick={() => setSelectedDayStr(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDayStr === todayStr
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Today ({scheduledOnly.filter(a => a.appointment_date === todayStr).length})
            </button>
            <button
              onClick={() => onNavigate('appointments')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors"
            >
              <Plus size={14} /> Book New
            </button>
          </div>
        </div>

        {/* Calendar and Appointments Agenda Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Mini Calendar Widget (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-gray-200">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-bold text-gray-900">{monthName}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Empty padding days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDayStr === dStr;
                const hasApt = !!dateToAptCount[dStr];
                const isToday = todayStr === dStr;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDayStr(isSelected ? '' : dStr)}
                    title={hasApt ? `${dateToAptCount[dStr]} appointment(s)` : undefined}
                    className={`relative h-8 rounded-lg flex flex-col items-center justify-center font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-700 text-white font-bold shadow-xs'
                        : isToday
                        ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                        : 'text-gray-700 hover:bg-gray-200/60'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasApt && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-purple-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" /> Appointments scheduled
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDayStr(todayStr)}
                  className="text-purple-700 font-semibold hover:underline"
                >
                  Today
                </button>
                {selectedDayStr && (
                  <button
                    onClick={() => setSelectedDayStr('')}
                    className="text-gray-500 hover:text-gray-900 font-semibold hover:underline"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Appointments Timeline / Agenda (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {selectedDayStr
                  ? `Appointments for ${formatDisplayDate(selectedDayStr)}`
                  : `All Upcoming Appointments (${upcomingAppointments.length})`}
              </h4>
              <span className="text-xs text-purple-700 font-semibold">
                {dayAppointments.length} scheduled
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400 text-xs">Loading appointments...</div>
            ) : dayAppointments.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-100 text-gray-400 text-xs space-y-3">
                <Clock size={24} className="mx-auto text-gray-300" />
                <p className="font-medium text-gray-600">
                  {selectedDayStr
                    ? `No appointments scheduled for ${formatDisplayDate(selectedDayStr)}`
                    : 'No upcoming appointments scheduled'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {selectedDayStr && (
                    <button
                      onClick={() => setSelectedDayStr('')}
                      className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 text-xs font-semibold hover:bg-purple-200 transition-colors"
                    >
                      Show All Upcoming ({scheduledOnly.length})
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('appointments')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Book an appointment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl bg-white border border-gray-100 card-shadow hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Appointment Time & Date Badge */}
                      <div className="px-3 py-2 bg-purple-50 text-purple-800 rounded-xl border border-purple-200 flex flex-col items-center justify-center flex-shrink-0 min-w-[76px]">
                        <Clock size={13} className="text-purple-600 mb-0.5" />
                        <span className="text-xs font-bold tracking-tight">
                          {formatFriendlyTime(apt.appointment_time || '09:00')}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                            apt.appointment_date === todayStr
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.appointment_date === tomorrowStr
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {apt.appointment_date === todayStr
                            ? 'Today'
                            : apt.appointment_date === tomorrowStr
                            ? 'Tomorrow'
                            : formatDisplayDate(apt.appointment_date)}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-gray-900 text-sm">
                            {apt.patient?.name || 'Patient'}
                          </h5>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              apt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>

                        <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                          {apt.procedure || 'Clinical Consultation & Checkup'}
                        </p>

                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Date: {apt.appointment_date} · Doctor: {apt.doctor?.name || 'Attending Doctor'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {onViewPatientDossier && apt.patient_id && (
                        <button
                          onClick={() => onViewPatientDossier(apt.patient_id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <User size={13} /> Records
                        </button>
                      )}
                      <button
                        onClick={() => onNavigate('appointments', apt.patient_id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity: Invoices & Recent Patients */}
      <div className={`grid grid-cols-1 ${isReceptionist ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-6`}>
        {/* Recent invoices */}
        {!isReceptionist && (
          <div className="bg-white rounded-3xl card-shadow overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Invoices</h3>
              <button
                onClick={() => onNavigate('invoices')}
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: '#4a7530' }}
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-400 text-xs">Loading...</div>
              ) : recentInvoices.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-xs">No invoices yet</div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-3.5 table-row-hover">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {(inv.patient as any)?.name ?? '—'}
                      </p>
                      <p className="text-[11px] text-gray-400">{inv.invoice_number}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-gray-900">
                        Rs. {Number(inv.total).toLocaleString()}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${statusColors[inv.payment_status]}`}
                      >
                        {inv.payment_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent patients */}
        <div className="bg-white rounded-3xl card-shadow overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Patients</h3>
            <button
              onClick={() => onNavigate('patients')}
              className="flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: '#4a7530' }}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400 text-xs">Loading...</div>
            ) : recentPatients.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-xs">No patients yet</div>
            ) : (
              recentPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onViewPatientDossier?.(p.id)}
                  className="flex items-center gap-4 px-6 py-3.5 table-row-hover cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: '#4a7530' }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                      View Records
                    </span>
                    <ArrowRight size={12} className="text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
