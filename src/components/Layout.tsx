import React, { useState } from 'react';
import {
  Stethoscope, LayoutDashboard, Users, Calendar, FileText, BarChart3,
  UserCog, LogOut, Menu, X, ChevronRight, Bell, Package, Pill, CheckCircle2,
  Settings, Building2, ChevronDown, ShieldCheck, Laptop
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicSettings } from '../lib/clinicSettings';

export type Page =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'examinations'
  | 'treatments'
  | 'prescriptions'
  | 'inventory'
  | 'invoices'
  | 'new-invoice'
  | 'reports'
  | 'staff'
  | 'setup';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onPreviewLanding?: () => void;
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients' as Page, label: 'Patients', icon: Users },
  { id: 'appointments' as Page, label: 'Appointments', icon: Calendar },
  { id: 'examinations' as Page, label: 'Dental Examination', icon: Stethoscope },
  { id: 'treatments' as Page, label: 'Treatments', icon: CheckCircle2 },
  { id: 'prescriptions' as Page, label: 'Prescriptions', icon: Pill },
  { id: 'inventory' as Page, label: 'Inventory', icon: Package },
  { id: 'invoices' as Page, label: 'Billing & Invoices', icon: FileText },
  { id: 'reports' as Page, label: 'Reports', icon: BarChart3, roles: ['admin', 'doctor'] as const },
  { id: 'staff' as Page, label: 'Staff', icon: UserCog, roles: ['admin', 'doctor'] as const },
  { id: 'setup' as Page, label: 'Clinic Setup', icon: Settings, roles: ['admin', 'doctor'] as const },
];

export default function Layout({ currentPage, onNavigate, onPreviewLanding, children }: LayoutProps) {
  const {
    staff,
    signOut,
    activeClinic,
    activeSessions,
    terminateSessionById,
    terminateAllOtherSessions,
  } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const visibleItems = navItems.filter(item =>
    !item.roles || (staff?.role && (item.roles as readonly string[]).includes(staff.role))
  );

  function SidebarContent() {
    return (
      <>
        {/* Logo & Clinic Branding */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => { onNavigate('setup'); setSidebarOpen(false); }}
          title="Click to manage Clinic Setup"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {clinic.logo_url ? (
              <img src={clinic.logo_url} alt={clinic.clinic_name} className="w-full h-full object-contain p-0.5" />
            ) : (
              <Stethoscope className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-semibold text-sm leading-none truncate">{clinic.clinic_name || activeClinic?.name || 'Clinsyst'}</p>
              {activeClinic?.plan && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-white/20 text-white uppercase tracking-wider">
                  {activeClinic.plan}
                </span>
              )}
            </div>
            <p className="text-white/60 text-xs mt-1 truncate">{clinic.tagline || activeClinic?.tagline || 'Clinic Workspace'}</p>
          </div>
        </div>



        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`} size={18} />
                <span className="truncate">{label}</span>
                {active && <ChevronRight className="ml-auto w-4 h-4 opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {staff?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{staff?.name ?? 'Staff'}</p>
              <span
                className="text-xs px-2 py-0.5 rounded-full capitalize font-medium"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                {staff?.role ?? '—'}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white text-sm transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--cream)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 h-full"
        style={{ background: '#3c5e27' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative flex flex-col w-64 h-full z-50"
            style={{ background: '#3c5e27' }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 card-shadow flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {currentPage === 'new-invoice' ? 'New Invoice' : currentPage.replace('-', ' ')}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">

            {/* Active Sessions Counter & Manager Button */}
            <button
              onClick={() => setShowSessionsModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200 transition-all hover:border-gray-300"
              title="View active device logins and manage session limits"
            >
              <ShieldCheck size={15} className="text-emerald-600" />
              <span className="hidden sm:inline text-gray-600">Active Logins:</span>
              <span className="font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded-md border border-gray-200">
                {activeSessions.length} / {activeClinic?.max_concurrent_sessions || 2}
              </span>
            </button>

            <button className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors relative">
              <Bell size={17} />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: '#3c5e27' }}
            >
              {staff?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Active Sessions Management Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Active Clinic Sessions</h3>
                  <p className="text-xs text-gray-500">
                    {activeClinic?.name} • Plan: <span className="font-bold uppercase text-emerald-700">{activeClinic?.plan}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Plan Session Quota Banner */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900">
                    Concurrent Session Limit: {activeClinic?.max_concurrent_sessions || 2} Logins
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {activeSessions.length} of {activeClinic?.max_concurrent_sessions || 2} active devices connected.
                  </p>
                </div>
                {activeSessions.length > 1 && (
                  <button
                    onClick={() => terminateAllOtherSessions()}
                    className="text-xs font-semibold px-2.5 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Sign Out Other Devices
                  </button>
                )}
              </div>

              {/* Sessions List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {activeSessions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No active sessions detected.</p>
                ) : (
                  activeSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        s.is_current ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          s.is_current ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Laptop size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-900 truncate">{s.device || 'Web Browser'}</p>
                            {s.is_current && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                This Window
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {s.user_name} ({s.role}) • {s.user_email}
                          </p>
                        </div>
                      </div>

                      {!s.is_current && (
                        <button
                          onClick={() => terminateSessionById(s.id)}
                          className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex-shrink-0"
                          title="Terminate this session"
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSessionsModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
