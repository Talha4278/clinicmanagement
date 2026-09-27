import React, { useState } from 'react';
import {
  Stethoscope, LayoutDashboard, Users, Calendar, FileText, BarChart3,
  UserCog, LogOut, Menu, X, ChevronRight, Bell, Package, Pill, CheckCircle2,
  Settings, Building2, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClinicSettings } from '../lib/clinicSettings';
import { getAllClinics } from '../lib/tenancy';

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

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { staff, signOut, activeClinic, switchClinicTenant } = useAuth();
  const { settings: clinic } = useClinicSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const allClinics = getAllClinics();

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

        {/* Multi-Clinic Switcher Dropdown (visible if multiple clinics exist) */}
        {allClinics.length > 1 && (
          <div className="px-3 pt-3 pb-1 border-b border-white/10">
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1 px-1">
              Switch Clinic Workspace
            </label>
            <select
              value={activeClinic?.id}
              onChange={(e) => switchClinicTenant(e.target.value)}
              className="w-full bg-white/15 text-white text-xs font-semibold rounded-xl px-2.5 py-1.5 border border-white/20 focus:outline-none cursor-pointer"
            >
              {allClinics.map(c => (
                <option key={c.id} value={c.id} className="text-gray-900">
                  {c.name} ({c.plan.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

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
    </div>
  );
}
