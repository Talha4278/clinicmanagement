import React, { useState, useEffect } from 'react';
import {
  Building2, Save, Upload, RefreshCw, CheckCircle2,
  Phone, Mail, MapPin, Globe, FileText, Image as ImageIcon,
  Stethoscope, Shield, Sparkles, HeartPulse, Activity,
  Plus, Trash2, Edit2, Check, X, Search, UserPlus, AlertCircle,
  UserCheck, UserX, Loader2, Clock, Receipt, CreditCard,
  MessageSquare, Send, Smartphone, Lock,
  ShieldCheck, Zap, Copy, Eye, EyeOff,
  CheckCheck, Landmark
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  useClinicSettings,
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_PROCEDURES,
} from '../lib/clinicSettings';
import {
  ClinicSettings,
  Staff,
} from '../lib/types';
import {
  validateProductionPaymentConfig,
  launchGlobalCheckout,
  ValidationResult,
} from '../lib/payments';
import {
  isDemoMode,
  getDemoStaff,
  saveDemoStaff,
  deleteDemoStaff,
  toggleDemoStaff,
} from '../lib/demoData';

const PRESET_ICONS = [
  { id: 'stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { id: 'heartpulse', label: 'Heart Pulse', icon: HeartPulse },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'shield', label: 'Shield Care', icon: Shield },
  { id: 'sparkles', label: 'Aesthetics', icon: Sparkles },
  { id: 'building', label: 'Clinic', icon: Building2 },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, GMT+4) — UAE, Oman', flag: '🇦🇪', region: 'UAE / GCC' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, GMT+3) — Saudi Arabia, Qatar, Bahrain', flag: '🇸🇦', region: 'Saudi / GCC' },
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (MYT, GMT+8) — Malaysia, KL', flag: '🇲🇾', region: 'Southeast Asia' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, GMT+8) — Singapore', flag: '🇸🇬', region: 'Southeast Asia' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, GMT+5) — Pakistan', flag: '🇵🇰', region: 'South Asia' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, GMT+0/+1) — United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, GMT-5/-4) — US Eastern', flag: '🇺🇸', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, GMT-8/-7) — US Pacific', flag: '🇺🇸', region: 'Americas' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', flag: '🌐', region: 'Global' },
];

const TAX_PRESETS = [
  { label: 'UAE VAT (5%)', rate: 5, symbol: 'AED ', country: 'United Arab Emirates' },
  { label: 'Saudi ZATCA VAT (15%)', rate: 15, symbol: 'SAR ', country: 'Saudi Arabia' },
  { label: 'Malaysia SST (6%)', rate: 6, symbol: 'RM ', country: 'Malaysia' },
  { label: 'UK VAT (20%)', rate: 20, symbol: '£', country: 'United Kingdom' },
  { label: 'Zero-Rated / Exempt (0%)', rate: 0, symbol: '$', country: 'Tax Exempt' },
];

const CURRENCY_OPTIONS = [
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal (SAR)' },
  { code: 'MYR', symbol: 'RM ', name: 'Malaysian Ringgit (RM)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'PKR', symbol: 'Rs. ', name: 'Pakistani Rupee (Rs.)' },
];

export default function ClinicSetup() {
  const { activeClinic } = useAuth();
  const { settings, updateSettings } = useClinicSettings();
  const [form, setForm] = useState<ClinicSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Clinic settings successfully updated!');
  const [selectedPresetIcon, setSelectedPresetIcon] = useState('stethoscope');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'profile' | 'localization' | 'whatsapp' | 'payments' | 'procedures' | 'doctors'
  >('profile');

  // Clock in clinic timezone
  const [currentTime, setCurrentTime] = useState('');

  // WhatsApp test send simulator state
  const [testMobile, setTestMobile] = useState('+971 50 123 4567');
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Payments key toggle
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Payment Diagnostics & Checkout Test State
  const [validationReport, setValidationReport] = useState<ValidationResult | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingCheckout, setTestingCheckout] = useState(false);
  const [checkoutTestStatus, setCheckoutTestStatus] = useState<string | null>(null);

  // Live clock effect
  useEffect(() => {
    function updateClock() {
      try {
        const now = new Intl.DateTimeFormat('en-US', {
          timeZone: form.timezone || 'Asia/Dubai',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(new Date());
        setCurrentTime(now);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [form.timezone]);

  // Procedures State
  const [newProcedureName, setNewProcedureName] = useState('');
  const [editingProcedureIndex, setEditingProcedureIndex] = useState<number | null>(null);
  const [editingProcedureValue, setEditingProcedureValue] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');

  // Real Database Attending Doctors State
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
  });
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editingDoctorForm, setEditingDoctorForm] = useState<Staff | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');

  // Sync settings state if updated externally
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Load real doctors from database
  useEffect(() => {
    fetchDoctors();
  }, [activeClinic?.id]);

  async function fetchDoctors() {
    setLoadingDoctors(true);
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    try {
      if (isDemoMode()) {
        const staff = getDemoStaff();
        setDoctors(staff.filter((s) => s.role === 'doctor'));
      } else {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('role', 'doctor')
          .order('name');
        if (!error && data) {
          setDoctors(data);
        }
      }
    } catch (err) {
      console.error('Error fetching attending doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  }

  function notifySuccess(msg: string) {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  }

  function handleSaveLocalization(e?: React.FormEvent) {
    if (e) e.preventDefault();
    updateSettings(form);
    notifySuccess('FDI notation, time zone & VAT settings saved successfully!');
  }

  function handleSaveWhatsApp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    updateSettings(form);
    notifySuccess('WhatsApp Cloud API & automated notification triggers saved successfully!');
  }

  function handleSavePayments(e?: React.FormEvent) {
    if (e) e.preventDefault();
    updateSettings(form);
    notifySuccess('Global payments, merchant of record & USD billing saved successfully!');
  }

  function handleSendTestWhatsApp() {
    if (!testMobile.trim()) {
      alert('Please enter a mobile phone number (e.g. +971 50 123 4567)');
      return;
    }
    setTestSending(true);
    setTimeout(() => {
      setTestSending(false);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4500);
    }, 1100);
  }

  function handleRunPaymentDiagnostics() {
    const report = validateProductionPaymentConfig(form.payment_gateway_config);
    setValidationReport(report);
  }

  async function handleTestCheckout(planId: 'starter' | 'pro' | 'network', priceUSD: number) {
    setTestingCheckout(true);
    setCheckoutTestStatus(null);
    try {
      const res = await launchGlobalCheckout({
        planId,
        planName: planId === 'starter' ? 'Starter Plan' : planId === 'pro' ? 'Pro Clinic' : 'Network Chain',
        priceUSD,
        billingCycle: 'monthly',
        customerEmail: form.email,
        clinicName: form.clinic_name,
        currency: 'USD',
        onSuccess: (details) => {
          setCheckoutTestStatus(`Authorization Verified! Tx: ${details.transactionId} for plan: ${details.planId.toUpperCase()}`);
        },
      });
      if (res.message && !res.redirected) {
        setCheckoutTestStatus(res.message);
      }
    } catch (err: any) {
      setCheckoutTestStatus(`Checkout error: ${err.message || err}`);
    } finally {
      setTestingCheckout(false);
    }
  }

  function handleCopyWebhookUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setForm({ ...form, logo_url: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clinic_name.trim()) {
      alert('Clinic Name is required');
      return;
    }
    updateSettings(form);
    notifySuccess('Clinic profile and invoice branding saved successfully!');
  }

  function handleResetAll() {
    if (confirm('Reset clinic profile to default branding?')) {
      const resetDefaults = getClinicSettings();
      setForm({ ...resetDefaults });
      updateSettings({ ...resetDefaults });
      notifySuccess('Clinic profile restored to default values.');
    }
  }

  // ─── PROCEDURES MANAGEMENT ──────────────────────────────────────────
  const currentProcedures = form.procedures && form.procedures.length > 0
    ? form.procedures
    : DEFAULT_PROCEDURES;

  function handleAddProcedure(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newProcedureName.trim();
    if (!trimmed) return;

    if (currentProcedures.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('This procedure already exists in the catalog.');
      return;
    }

    const updatedProcedures = [...currentProcedures, trimmed];
    const updatedForm = { ...form, procedures: updatedProcedures };
    setForm(updatedForm);
    updateSettings(updatedForm);
    setNewProcedureName('');
    notifySuccess(`Procedure "${trimmed}" added successfully!`);
  }

  function handleStartEditProcedure(index: number, currentVal: string) {
    setEditingProcedureIndex(index);
    setEditingProcedureValue(currentVal);
  }

  function handleSaveEditProcedure(index: number) {
    const trimmed = editingProcedureValue.trim();
    if (!trimmed) {
      alert('Procedure name cannot be empty');
      return;
    }

    const duplicate = currentProcedures.some(
      (p, i) => i !== index && p.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert('Another procedure already has this name.');
      return;
    }

    const updatedProcedures = [...currentProcedures];
    updatedProcedures[index] = trimmed;
    const updatedForm = { ...form, procedures: updatedProcedures };
    setForm(updatedForm);
    updateSettings(updatedForm);
    setEditingProcedureIndex(null);
    notifySuccess(`Procedure updated to "${trimmed}"`);
  }

  function handleRemoveProcedure(index: number, name: string) {
    if (confirm(`Remove procedure "${name}"? It will no longer appear in new appointment selections.`)) {
      const updatedProcedures = currentProcedures.filter((_, i) => i !== index);
      const updatedForm = { ...form, procedures: updatedProcedures };
      setForm(updatedForm);
      updateSettings(updatedForm);
      notifySuccess(`Procedure "${name}" removed.`);
    }
  }

  function handleResetProcedures() {
    if (confirm('Reset clinical procedures catalog to standard dental & aesthetic defaults?')) {
      const updatedForm = { ...form, procedures: DEFAULT_PROCEDURES };
      setForm(updatedForm);
      updateSettings(updatedForm);
      notifySuccess('Procedures catalog reset to standard defaults.');
    }
  }

  // ─── ATTENDING DOCTORS MANAGEMENT (REAL DATABASE) ───────────────────
  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = newDoctor.name.trim();
    if (!trimmedName) {
      alert('Doctor Name is required.');
      return;
    }

    setSavingDoctor(true);
    const formattedName = trimmedName.startsWith('Dr') ? trimmedName : `Dr. ${trimmedName.replace(/^Dr\.?\s*/i, '')}`;
    const emailToUse = newDoctor.email.trim() || `dr.${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clinic.local`;

    try {
      if (isDemoMode()) {
        saveDemoStaff({
          name: formattedName,
          role: 'doctor',
          specialization: newDoctor.specialization.trim() || 'General Dental Practitioner',
          phone: newDoctor.phone.trim() || null,
          email: emailToUse,
          active: true,
        });
      } else {
        const { error } = await supabase.from('staff').insert({
          clinic_id: activeClinic?.id || 'clinic-dentivista-01',
          name: formattedName,
          role: 'doctor',
          specialization: newDoctor.specialization.trim() || 'General Dental Practitioner',
          phone: newDoctor.phone.trim() || null,
          email: emailToUse,
          active: true,
        });

        if (error) {
          alert(`Error adding doctor to database: ${error.message}`);
          setSavingDoctor(false);
          return;
        }
      }

      await fetchDoctors();
      setNewDoctor({ name: '', specialization: '', phone: '', email: '' });
      setShowAddDoctorForm(false);
      notifySuccess(`Doctor ${formattedName} added to database!`);
    } catch (err: any) {
      alert(`Error saving doctor: ${err?.message || err}`);
    } finally {
      setSavingDoctor(false);
    }
  }

  function handleStartEditDoctor(doc: Staff) {
    setEditingDoctorId(doc.id);
    setEditingDoctorForm({ ...doc });
  }

  async function handleSaveEditDoctor() {
    if (!editingDoctorForm || !editingDoctorForm.name.trim()) {
      alert('Doctor Name is required.');
      return;
    }

    setSavingDoctor(true);
    const formattedName = editingDoctorForm.name.trim();

    try {
      if (isDemoMode()) {
        saveDemoStaff({
          id: editingDoctorId || undefined,
          name: formattedName,
          role: 'doctor',
          specialization: editingDoctorForm.specialization?.trim() || null,
          phone: editingDoctorForm.phone?.trim() || null,
          email: editingDoctorForm.email?.trim() || `dr.${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clinic.local`,
          active: editingDoctorForm.active,
        });
      } else {
          const clinicId = activeClinic?.id || 'clinic-dentivista-01';
          const { error } = await supabase
            .from('staff')
            .update({
              name: formattedName,
              specialization: editingDoctorForm.specialization?.trim() || null,
              phone: editingDoctorForm.phone?.trim() || null,
              email: editingDoctorForm.email?.trim() || undefined,
              active: editingDoctorForm.active,
            })
            .eq('id', editingDoctorId)
            .eq('clinic_id', clinicId);

          if (error) {
            alert(`Error updating doctor in database: ${error.message}`);
            setSavingDoctor(false);
            return;
          }
        }

        await fetchDoctors();
        setEditingDoctorId(null);
        setEditingDoctorForm(null);
        notifySuccess(`Doctor ${formattedName} updated successfully in database!`);
      } catch (err: any) {
        alert(`Error updating doctor: ${err?.message || err}`);
      } finally {
        setSavingDoctor(false);
      }
    }

    async function handleToggleDoctorActive(doc: Staff) {
      const clinicId = activeClinic?.id || 'clinic-dentivista-01';
      try {
        if (isDemoMode()) {
          toggleDemoStaff(doc.id);
        } else {
          const { error } = await supabase
            .from('staff')
            .update({ active: !doc.active })
            .eq('id', doc.id)
            .eq('clinic_id', clinicId);

          if (error) {
            alert(`Error toggling doctor status: ${error.message}`);
            return;
          }
        }
        await fetchDoctors();
      } catch (err: any) {
        console.error('Error toggling doctor status:', err);
      }
    }

    async function handleRemoveDoctor(doc: Staff) {
      if (!confirm(`Are you sure you want to remove ${doc.name} from the attending doctors list?`)) {
        return;
      }

      const clinicId = activeClinic?.id || 'clinic-dentivista-01';
      try {
        if (isDemoMode()) {
          deleteDemoStaff(doc.id);
          notifySuccess(`Doctor ${doc.name} removed.`);
        } else {
          const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', doc.id)
            .eq('clinic_id', clinicId);
          if (error) {
            // If foreign key constraint blocks deletion, deactivate instead
            await supabase
              .from('staff')
              .update({ active: false })
              .eq('id', doc.id)
              .eq('clinic_id', clinicId);
            notifySuccess(`Doctor ${doc.name} has clinical records in database and was deactivated.`);
          } else {
            notifySuccess(`Doctor ${doc.name} removed from database.`);
          }
        }
        await fetchDoctors();
      } catch (err: any) {
        alert(`Error removing doctor: ${err?.message || err}`);
      }
    }

  // Filtered views
  const filteredProcedures = currentProcedures.filter((p) =>
    p.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (d.specialization && d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())) ||
      (d.phone && d.phone.includes(doctorSearch))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Building2 className="text-emerald-700" size={26} />
            Clinic Setup & Clinical Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure clinic profile branding, clinical procedures catalog, and attending doctors directory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw size={13} /> Reset Branding
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'profile'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <Building2 size={14} />
          Clinic Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('localization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'localization'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <Globe size={14} />
          FDI Notation, Time Zone & VAT
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeTab === 'localization' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
          >
            {form.tooth_notation?.toUpperCase() || 'FDI'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'whatsapp'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <MessageSquare size={14} />
          WhatsApp Cloud API
          <span
            className={`w-2 h-2 rounded-full ${form.whatsapp_config?.enabled !== false ? 'bg-emerald-400' : 'bg-gray-300'
              }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'payments'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <CreditCard size={14} />
          Subscription Plans
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('procedures')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'procedures'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <Activity size={14} />
          Procedures
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === 'procedures' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}
          >
            {currentProcedures.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'doctors'
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
            }`}
        >
          <Stethoscope size={14} />
          Doctors
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === 'doctors' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}
          >
            {doctors.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CLINIC PROFILE & IDENTITY                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Panel (7 cols) */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 card-shadow space-y-5"
          >
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Clinic Identity & Branding
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                These details will automatically appear on all invoices, receipts, and prescription slips.
              </p>
            </div>

            {/* Clinic Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="e.g. Dentivista"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tagline / Specialization
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Dental & Aesthetics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>
            </div>

            {/* Logo / Icon Upload & Select */}
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
              <label className="block text-xs font-semibold text-gray-700 uppercase">
                Clinic Icon / Logo
              </label>

              <div className="flex items-center gap-4">
                {/* Preview Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center overflow-hidden border-2 border-emerald-600/50 shadow-md flex-shrink-0">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Clinic Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Stethoscope size={30} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs">
                      <Upload size={13} /> Upload Image (PNG/JPG)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {form.logo_url && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: '' })}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-gray-400" />
                    <input
                      type="url"
                      value={form.logo_url || ''}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-[11px] text-gray-800 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Icon Selector when no custom image */}
              {!form.logo_url && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1.5">
                    Or pick a clinic badge style:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ICONS.map((p) => {
                      const IconComp = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPresetIcon(p.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selectedPresetIcon === p.id
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                          <IconComp size={13} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Official Contact & Address
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Contact Phone / Mobile *
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+92 300 0000000"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Clinic Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="clinic@dentivista.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Clinic Full Address *
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      rows={2}
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Floor, Plaza, Street, City..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Website / Portal
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.website || ''}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="www.yourclinic.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tax / License Registration #
                  </label>
                  <input
                    type="text"
                    value={form.tax_number || ''}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                    placeholder="e.g. NTN-8921-D"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
                style={{ background: '#3c5e27' }}
              >
                <Save size={15} /> Save Clinic Identity
              </button>
            </div>
          </form>

          {/* Live Preview Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-700" />
                  Live Invoice Header Preview
                </h4>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Synchronized
                </span>
              </div>

              {/* Rendered mini invoice preview */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm text-white">
                {/* Header */}
                <div className="p-4" style={{ background: '#3c5e27' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Stethoscope className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-display font-bold text-lg text-white leading-tight">
                          {form.clinic_name || 'Clinic Name'}
                        </h5>
                        <p className="text-white/80 text-[11px]">
                          {form.tagline || 'Specialization'}
                        </p>
                        <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">
                          {form.address || 'Clinic Address'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-white/50 block">Invoice</span>
                      <span className="font-mono text-xs font-bold text-white">INV-0042</span>
                    </div>
                  </div>
                </div>

                {/* Sample Body */}
                <div className="bg-white p-4 text-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px] text-gray-500">
                    <span>Contact: {form.phone}</span>
                    <span>Email: {form.email}</span>
                  </div>
                  <div className="py-2 text-[11px] text-gray-400 italic text-center">
                    Invoice line items and patient charges will render here...
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                  <span>{form.clinic_name} · All Rights Reserved</span>
                  <span className="font-semibold text-gray-700">{form.phone}</span>
                </div>
              </div>
            </div>

            {/* Live Prescription Header Preview */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Stethoscope size={14} className="text-emerald-700" />
                Live Prescription Slip Preview
              </h4>

              <div className="p-4 border-2 border-emerald-800/80 rounded-2xl bg-white text-gray-900 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden"
                      style={{ background: '#3c5e27' }}
                    >
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope size={16} />
                      )}
                    </div>
                    <div>
                      <h5 className="font-display font-bold text-base text-gray-900 leading-none">
                        {form.clinic_name}
                      </h5>
                      <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider mt-0.5">
                        {form.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <p>{form.phone}</p>
                    <p>{form.email}</p>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 border-t border-gray-100 pt-1.5">
                  {form.address} {form.website ? `· ${form.website}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB: LOCALIZATION, FDI TOOTH NOTATION, TIMEZONE & VAT               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'localization' && (
        <form onSubmit={handleSaveLocalization} className="space-y-6">
          {/* 1. TOOTH NOTATION TOGGLE (NON-NEGOTIABLE) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    🦷
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    Tooth Notation System (FDI vs Universal)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Non-Negotiable
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  Dentists in the UAE, GCC, UK, Europe, and Southeast Asia use the FDI two-digit notation (e.g., Upper Right Central Incisor is 11, Upper Left is 21). Universal (1–32) is predominantly used in the US.
                </p>
              </div>

              {/* Status Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-200 text-xs font-semibold text-gray-700">
                Current System:{' '}
                <span className="text-emerald-800 font-bold uppercase">
                  {form.tooth_notation === 'universal' ? 'Universal (1–32)' : 'FDI (11–48)'}
                </span>
              </div>
            </div>

            {/* The Main Single Toggle */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tooth Notation: FDI (11–48) | Universal (1–32)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FDI Option */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tooth_notation: 'fdi' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative ${(form.tooth_notation || 'fdi') === 'fdi'
                    ? 'border-emerald-700 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-700/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          FDI Two-Digit Notation (11–48)
                        </span>
                        {(form.tooth_notation || 'fdi') === 'fdi' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ISO 3950 standard across UAE, Saudi Arabia, Qatar, Malaysia, UK & Europe.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${(form.tooth_notation || 'fdi') === 'fdi'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-gray-300'
                        }`}
                    >
                      {(form.tooth_notation || 'fdi') === 'fdi' && <Check size={12} />}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-600 font-mono">
                    <span>UR: 18..11</span>
                    <span>UL: 21..28</span>
                    <span>LL: 31..38</span>
                    <span>LR: 41..48</span>
                  </div>
                </button>

                {/* Universal Option */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tooth_notation: 'universal' })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative ${form.tooth_notation === 'universal'
                    ? 'border-emerald-700 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-700/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          Universal Numbering (1–32)
                        </span>
                        {form.tooth_notation === 'universal' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        American Dental Association (ADA) standard sequential 1 to 32.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.tooth_notation === 'universal'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-gray-300'
                        }`}
                    >
                      {form.tooth_notation === 'universal' && <Check size={12} />}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-600 font-mono">
                    <span>UR: 1..8</span>
                    <span>UL: 9..16</span>
                    <span>LL: 17..24</span>
                    <span>LR: 25..32</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Visual Odontogram Reference Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                Live Odontogram Notation Sample ({form.tooth_notation === 'universal' ? 'Universal' : 'FDI'}):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block font-semibold">UR Central Incisor</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {form.tooth_notation === 'universal' ? 'Tooth #8' : 'Tooth 11'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {form.tooth_notation === 'universal' ? '(FDI: 11)' : '(Universal: #8)'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block font-semibold">UL Central Incisor</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {form.tooth_notation === 'universal' ? 'Tooth #9' : 'Tooth 21'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {form.tooth_notation === 'universal' ? '(FDI: 21)' : '(Universal: #9)'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block font-semibold">LL First Molar</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {form.tooth_notation === 'universal' ? 'Tooth #19' : 'Tooth 36'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {form.tooth_notation === 'universal' ? '(FDI: 36)' : '(Universal: #19)'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block font-semibold">LR First Molar</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {form.tooth_notation === 'universal' ? 'Tooth #30' : 'Tooth 46'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {form.tooth_notation === 'universal' ? '(FDI: 46)' : '(Universal: #30)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. TIME ZONE & LIVE CLINIC CLOCK */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-5">
            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-emerald-700" />
                  Clinic Time Zone Configuration
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synchronize your appointment slots, operational hours, SMS/WhatsApp triggers, and invoice logs.
                </p>
              </div>

              {/* Pulsing live badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Live Clinic Clock: {currentTime || 'Loading...'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Selector */}
              <div className="md:col-span-7 space-y-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Select Local Time Zone *
                </label>
                <select
                  value={form.timezone || 'Asia/Dubai'}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.flag} {tz.label}
                    </option>
                  ))}
                </select>

                <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    Automatic DST & Calendar Alignment
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Appointments booked by patients via the online portal or WhatsApp will automatically convert to your clinic's configured local time zone ({form.timezone || 'Asia/Dubai'}).
                  </p>
                </div>
              </div>

              {/* Live Clock Card */}
              <div className="md:col-span-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-md space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-200">
                  <span className="uppercase tracking-wider font-semibold">Active Timezone</span>
                  <span>{form.timezone || 'Asia/Dubai'}</span>
                </div>
                <div className="font-mono text-2xl font-black tracking-tight text-white py-1">
                  {currentTime || '00:00:00'}
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  All medical record timestamps, doctor shift hours, and patient reminders are anchored to this clock.
                </p>
              </div>
            </div>
          </div>

          {/* 3. TAX / VAT & CURRENCY SETTINGS */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-5">
            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-700" />
                  Tax / VAT Rates & Billing Currency
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure custom VAT/Tax compliance (e.g., 5% UAE VAT, 15% Saudi ZATCA) and clinic billing currency.
                </p>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Presets:</span>
                {TAX_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        tax_label: preset.label,
                        tax_rate: preset.rate,
                        currency_symbol: preset.symbol,
                      })
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-colors font-medium text-gray-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Tax Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax / VAT Label *
                </label>
                <input
                  type="text"
                  required
                  value={form.tax_label || ''}
                  onChange={(e) => setForm({ ...form, tax_label: e.target.value })}
                  placeholder="e.g. UAE VAT (5%)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {/* Tax Rate % */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax Rate (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={form.tax_rate ?? 5}
                    onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-600/20 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* TRN / Tax Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax / TRN Registration #
                </label>
                <input
                  type="text"
                  value={form.tax_number || ''}
                  onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                  placeholder="e.g. 100234567800003"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {/* Currency Symbol */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Invoice Currency Symbol *
                </label>
                <select
                  value={form.currency_symbol || 'AED '}
                  onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-600/20"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.symbol}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Invoice VAT Calculation Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                Sample Patient Invoice Calculation:
              </span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Treatment Procedure:</span>{' '}
                  <span className="font-semibold text-gray-800">Ceramic Crown Restoration (#11)</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>Subtotal: {form.currency_symbol || 'AED '}500.00</span>
                  <span className="text-emerald-700 font-semibold">
                    +{form.tax_label || 'VAT'} ({form.tax_rate ?? 5}%):{' '}
                    {form.currency_symbol || 'AED '}
                    {(((form.tax_rate ?? 5) / 100) * 500).toFixed(2)}
                  </span>
                  <span className="font-bold text-gray-900 px-2.5 py-1 rounded-lg bg-white border border-gray-300">
                    Total: {form.currency_symbol || 'AED '}
                    {(500 + ((form.tax_rate ?? 5) / 100) * 500).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
              style={{ background: '#3c5e27' }}
            >
              <Save size={15} /> Save FDI Notation, Time Zone & VAT Settings
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB: WHATSAPP NOTIFICATION ENGINE (META CLOUD API & TWILIO)         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveWhatsApp} className="space-y-6">
          {/* Header & Overview */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    💬
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    WhatsApp Automated Notifications (Meta Cloud API & Twilio)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    80%+ Confirmation Rate
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  In Dubai, Riyadh, and Kuala Lumpur, clinics confirm 80%+ of appointments via WhatsApp. Integrate Meta WhatsApp Cloud API or Twilio to send automated confirmations, 24h & 2h reminder links, and digital invoice receipts.
                </p>
              </div>

              {/* Master toggle */}
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-200 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsapp_config?.enabled !== false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      whatsapp_config: {
                        ...(form.whatsapp_config || {
                          provider: 'cloud_api',
                          enabled: true,
                        }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>WhatsApp Engine Enabled</span>
              </label>
            </div>

            {/* Provider Switcher */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select WhatsApp Integration Provider
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Meta Cloud API */}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      whatsapp_config: {
                        ...(form.whatsapp_config || { enabled: true }),
                        provider: 'cloud_api',
                      },
                    })
                  }
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${(form.whatsapp_config?.provider || 'cloud_api') === 'cloud_api'
                    ? 'border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Zap size={14} className="text-emerald-700" />
                      Meta Cloud API (Official)
                    </span>
                    {(form.whatsapp_config?.provider || 'cloud_api') === 'cloud_api' && (
                      <Check size={14} className="text-emerald-700" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Recommended for UAE & GCC clinics. Direct WhatsApp Business Graph API with verified green badge support.
                  </p>
                </button>

                {/* Twilio */}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      whatsapp_config: {
                        ...(form.whatsapp_config || { enabled: true }),
                        provider: 'twilio',
                      },
                    })
                  }
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${form.whatsapp_config?.provider === 'twilio'
                    ? 'border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Smartphone size={14} className="text-blue-600" />
                      Twilio WhatsApp
                    </span>
                    {form.whatsapp_config?.provider === 'twilio' && (
                      <Check size={14} className="text-emerald-700" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Twilio programmable messaging pipeline with international fallback and worldwide carrier delivery.
                  </p>
                </button>

                {/* Direct Web */}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      whatsapp_config: {
                        ...(form.whatsapp_config || { enabled: true }),
                        provider: 'direct_web',
                      },
                    })
                  }
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${form.whatsapp_config?.provider === 'direct_web'
                    ? 'border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Send size={14} className="text-gray-600" />
                      Click-to-Chat Link (Web)
                    </span>
                    {form.whatsapp_config?.provider === 'direct_web' && (
                      <Check size={14} className="text-emerald-700" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Zero-cost browser deep-link fallback. Opens patient's WhatsApp Web or mobile app directly.
                  </p>
                </button>
              </div>
            </div>

            {/* Provider Configuration Fields */}
            {(form.whatsapp_config?.provider || 'cloud_api') === 'cloud_api' ? (
              <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/80 space-y-4">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} className="text-emerald-700" />
                  Meta WhatsApp Cloud API Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.phone_number_id || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'cloud_api' }),
                            phone_number_id: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. 109283746501928"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      WhatsApp Business Account ID (WABA ID) *
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.waba_id || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'cloud_api' }),
                            waba_id: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. 778899001122334"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Permanent User Access Token (Bearer) *
                    </label>
                    <input
                      type="password"
                      value={form.whatsapp_config?.auth_token || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'cloud_api' }),
                            auth_token: e.target.value,
                          },
                        })
                      }
                      placeholder="EAABwz..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Webhook Callback URL (Read Only)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value="https://api.clinsyst.com/v1/whatsapp/webhook"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-100 font-mono text-gray-600 select-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Webhook Verify Token
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.webhook_verify_token || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'cloud_api' }),
                            webhook_verify_token: e.target.value,
                          },
                        })
                      }
                      placeholder="clinsyst_verify_token_gcc"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : form.whatsapp_config?.provider === 'twilio' ? (
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-4">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} className="text-blue-700" />
                  Twilio Programmable WhatsApp Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Account SID *
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.account_sid || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'twilio' }),
                            account_sid: e.target.value,
                          },
                        })
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Auth Token *
                    </label>
                    <input
                      type="password"
                      value={form.whatsapp_config?.auth_token || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'twilio' }),
                            auth_token: e.target.value,
                          },
                        })
                      }
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Twilio WhatsApp Number *
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.twilio_phone_number || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          whatsapp_config: {
                            ...(form.whatsapp_config || { enabled: true, provider: 'twilio' }),
                            twilio_phone_number: e.target.value,
                          },
                        })
                      }
                      placeholder="whatsapp:+14155238886"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Automated Triggers Checklist */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Automated Clinical WhatsApp Triggers
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">Instant Appointment Confirmation</span>
                    <span className="text-gray-500 text-[11px]">
                      Dispatched immediately when reception books an appointment with doctor name & time.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">24-Hour & 2-Hour Reminder Links</span>
                    <span className="text-gray-500 text-[11px]">
                      Interactive 1-click confirmation URL for patient to confirm or reschedule without calling.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">Invoice & Digital Receipt Dispatch</span>
                    <span className="text-gray-500 text-[11px]">
                      Sends itemized PDF invoice and treatment breakdown immediately following payment.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">FDI Tooth Notation Included</span>
                    <span className="text-gray-500 text-[11px]">
                      Appointment and treatment reminders mention specific teeth using FDI notation ({form.tooth_notation === 'universal' ? 'Universal' : 'FDI'}).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Message Simulator & Test Tool */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-emerald-700" />
                  Live Message Simulator & Test Dispatch
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value)}
                    placeholder="+971 50 123 4567"
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 bg-white w-40"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestWhatsApp}
                    disabled={testSending}
                    className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    {testSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Send Test
                  </button>
                </div>
              </div>

              {testSent && (
                <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCheck size={16} className="text-emerald-700" />
                  <span>Test WhatsApp appointment reminder dispatched to {testMobile}!</span>
                </div>
              )}

              {/* Chat bubble simulation */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#e5ddd5] shadow-inner">
                <div className="bg-white rounded-2xl p-3.5 shadow-sm text-xs text-gray-800 space-y-2 relative border border-gray-200">
                  <p className="font-bold text-emerald-900">
                    {form.clinic_name || 'Dentivista Dental Clinic'} 🦷
                  </p>
                  <p>
                    Hello <b>Sarah</b>! Your dental appointment is confirmed with{' '}
                    <b>Dr. Usman Tariq</b>.
                  </p>
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-100 space-y-0.5 text-[11px]">
                    <p>📅 <b>Date:</b> Tomorrow at 04:30 PM ({form.timezone || 'Asia/Dubai'})</p>
                    <p>🩺 <b>Procedure:</b> Composite Restoration (#11 Upper Right Incisor)</p>
                    <p>📍 <b>Location:</b> {form.address || 'Downtown Clinic'}</p>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    👉 Click to confirm 1-touch: <span className="underline">clinsyst.com/c/apt-4819</span>
                  </p>
                  <span className="text-[10px] text-gray-400 block text-right mt-1">
                    12:30 PM · Delivered ✓✓
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
              style={{ background: '#3c5e27' }}
            >
              <Save size={15} /> Save WhatsApp Configuration & Triggers
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB: SUBSCRIPTION PLANS & PAYMENT METHOD HUB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Main Container */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    💳
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    Subscription Plans & Payment Methods
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    Secure & Verified
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  Choose your preferred payment method for software subscriptions. Local Pakistani clinics can pay directly via bank transfer / Raast / NayaPay, and international card checkout is coming soon.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <ShieldCheck size={14} className="text-emerald-700" />
                Active Modes: <span className="font-bold">Direct Bank Transfer</span>
              </div>
            </div>

            {/* Payment Options Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Option 1: Credit / Debit Card Checkout (Coming Soon) */}
              <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-sky-50/30 space-y-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <CreditCard size={18} className="text-sky-600" />
                      Credit & Debit Card Checkout
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-xs flex items-center gap-1">
                      <Clock size={11} />
                      Coming Soon
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Automated online card payments for <strong>Visa, Mastercard, Apple Pay, & Google Pay</strong> are currently under integration for global subscription processing.
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-700 pt-1">
                    <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center gap-1 text-gray-800">
                      💳 Credit & Debit Cards
                    </span>
                    <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center gap-1 text-gray-800">
                      🍏 Apple Pay & GPay
                    </span>
                    <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center gap-1 text-gray-800">
                      🌐 Global Currencies
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2 mt-2">
                    <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-snug">
                      <span className="font-bold text-amber-950 block">Card Checkout Method Coming Soon</span>
                      We are currently completing verification for international card gateways. In the meantime, please use <strong>Direct Bank Transfer</strong> or WhatsApp support for instant activation.
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-gray-400 bg-gray-100 border border-gray-200 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed shadow-none"
                  >
                    <Clock size={14} className="text-gray-400" />
                    <span>Card Checkout — Coming Soon</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Direct Bank Transfer (Pakistan) */}
              <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                      <Landmark size={18} className="text-emerald-700" />
                      Direct Bank / NayaPay / Raast (Pakistan Local Clinics)
                    </span>

                  </div>

                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    Direct local bank transfer for Pakistani clinics via <strong>NayaPay, UBL, Raast Instant Payment, or EasyPaisa</strong> with zero platform fees.
                  </p>

                  {/* Bank Account Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-emerald-950 bg-white/90 p-3 rounded-xl border border-emerald-200">
                    <div>
                      <span className="text-gray-500 text-[10px] block font-normal">Bank Names</span>
                      <span className="font-bold">UBL (United Bank Limited)</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block font-normal">Account Title</span>
                      <span className="font-bold">Talha Sarfraz Malik</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block font-normal">IBAN (UBL)</span>
                      <span className="font-mono text-[11px] font-bold select-all">PK66 UNIL 0109 0003 6725 1495</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block font-normal">Raast / NayaPay / EasyPaisa</span>
                      <span className="font-mono text-[11px] font-bold select-all">0334 4634278</span>
                    </div>
                  </div>

                  {/* QR Code Images */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block mb-1.5">
                      Scan & Pay QR Codes (NayaPay & UBL Digital)
                    </span>
                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                      <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                        <img src="/payments/nayapay_qr.jpg" alt="NayaPay QR Code" className="w-full h-32 object-contain rounded-lg" />
                        <span className="text-[10px] font-bold text-gray-700 block">NayaPay QR</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                        <img src="/payments/ubl_qr.jpg" alt="UBL Digital QR Code" className="w-full h-32 object-contain rounded-lg" />
                        <span className="text-[10px] font-bold text-gray-700 block">UBL Bank QR</span>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href={`https://wa.me/923093622732?text=${encodeURIComponent(
                    `Hi, I am sending the subscription payment receipt for ${form.clinic_name || 'my clinic'}. Please activate my subscription.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <MessageSquare size={14} />
                  <span>Send Payment Receipt on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Status Banner */}
            {checkoutTestStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                  <span>{checkoutTestStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutTestStatus(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'procedures' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
          {/* Header & Reset Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-emerald-700" size={18} />
                Clinical Procedures Catalog
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, edit, or remove procedure names used during appointment booking, treatment planning, and invoicing.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetProcedures}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={12} /> Reset to Standard Procedures
            </button>
          </div>

          {/* Add Procedure Form & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Add New Procedure Form (8 cols) */}
            <form onSubmit={handleAddProcedure} className="md:col-span-8 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newProcedureName}
                  onChange={(e) => setNewProcedureName(e.target.value)}
                  placeholder="Enter new procedure name (e.g. Dental Veneers, Wisdom Tooth Extraction...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-gray-900 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={!newProcedureName.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                style={{ background: '#3c5e27' }}
              >
                <Plus size={15} /> Add Procedure
              </button>
            </form>

            {/* Search Filter (4 cols) */}
            <div className="md:col-span-4 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                placeholder="Search procedures..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Procedures List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-2">
              <span>{filteredProcedures.length} Procedures Available</span>
              {procedureSearch && (
                <button
                  type="button"
                  onClick={() => setProcedureSearch('')}
                  className="text-emerald-700 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredProcedures.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs space-y-2">
                <AlertCircle size={24} className="mx-auto text-gray-300" />
                <p className="font-semibold text-gray-600">No procedures found</p>
                <p>Click "Add Procedure" above or reset to standard dental procedures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentProcedures.map((procName, idx) => {
                  if (
                    procedureSearch &&
                    !procName.toLowerCase().includes(procedureSearch.toLowerCase())
                  ) {
                    return null;
                  }

                  const isEditing = editingProcedureIndex === idx;

                  return (
                    <div
                      key={`${procName}-${idx}`}
                      className="p-3 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-200 flex items-center justify-between gap-2 transition-all hover:shadow-xs group"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingProcedureValue}
                            onChange={(e) => setEditingProcedureValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditProcedure(idx);
                              if (e.key === 'Escape') setEditingProcedureIndex(null);
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-500 text-xs text-gray-900 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditProcedure(idx)}
                            className="p-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                            title="Save procedure name"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProcedureIndex(null)}
                            className="p-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {procName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditProcedure(idx, procName)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title="Edit procedure name"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProcedure(idx, procName)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove procedure"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: ATTENDING DOCTORS MANAGEMENT (DATABASE DRIVEN)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
          {/* Header & Reset Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="text-emerald-700" size={18} />
                Attending Doctors & Specialists Directory
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, edit, or remove attending doctors in your clinic database. Doctors appear directly in appointment booking and clinical notes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDoctors}
                disabled={loadingDoctors}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={12} className={loadingDoctors ? 'animate-spin' : ''} /> Refresh
              </button>

              <button
                type="button"
                onClick={() => setShowAddDoctorForm(!showAddDoctorForm)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs"
                style={{ background: '#3c5e27' }}
              >
                <UserPlus size={13} /> {showAddDoctorForm ? 'Close Form' : 'Add New Doctor'}
              </button>
            </div>
          </div>

          {/* Add Doctor Quick Form */}
          {showAddDoctorForm && (
            <form
              onSubmit={handleAddDoctor}
              className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-emerald-700" />
                  New Attending Doctor Details
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Doctor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    placeholder="e.g. Dr. Usman Tariq"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Specialization / Title
                  </label>
                  <input
                    type="text"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    placeholder="e.g. Orthodontist / Dental Surgeon"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    placeholder="doctor@dentivista.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorForm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoctor}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  style={{ background: '#3c5e27' }}
                >
                  {savingDoctor ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Doctor
                </button>
              </div>
            </form>
          )}

          {/* Search bar & count */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500 font-semibold self-start sm:self-center">
              {filteredDoctors.length} Attending Doctors in Clinic Database
            </span>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctors by name or specialty..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Doctors Grid */}
          {loadingDoctors ? (
            <div className="p-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-700" />
              <span>Loading doctors from database...</span>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs space-y-2">
              <AlertCircle size={24} className="mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600">No attending doctors found</p>
              <p>Click "Add New Doctor" above to register doctors in your clinic database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => {
                const isEditing = editingDoctorId === doc.id;

                if (isEditing && editingDoctorForm) {
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-white border-2 border-emerald-600 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                          Edit Doctor
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoctorId(null);
                            setEditingDoctorForm(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Doctor Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editingDoctorForm.name}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, name: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 font-semibold text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Specialization
                          </label>
                          <input
                            type="text"
                            value={editingDoctorForm.specialization || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({
                                ...editingDoctorForm,
                                specialization: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Phone / WhatsApp
                          </label>
                          <input
                            type="text"
                            value={editingDoctorForm.phone || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, phone: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editingDoctorForm.email || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, email: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingDoctorForm.active !== false}
                              onChange={(e) =>
                                setEditingDoctorForm({
                                  ...editingDoctorForm,
                                  active: e.target.checked,
                                })
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            Active for scheduling
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoctorId(null);
                            setEditingDoctorForm(null);
                          }}
                          className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditDoctor}
                          disabled={savingDoctor}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-xs font-bold shadow-xs disabled:opacity-50"
                          style={{ background: '#3c5e27' }}
                        >
                          {savingDoctor ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                        </button>
                      </div>
                    </div>
                  );
                }

                const isActive = doc.active !== false;

                return (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-2xl border transition-all ${isActive
                      ? 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-xs'
                      : 'bg-gray-50/80 border-gray-200/60 opacity-70'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs"
                          style={{ background: isActive ? '#3c5e27' : '#6b7280' }}
                        >
                          {doc.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() || 'D'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 leading-tight">
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            {doc.specialization || 'Attending Doctor'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditDoctor(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="Edit doctor details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoctor(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove doctor"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                      {doc.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-400" />
                          <span>{doc.phone}</span>
                        </div>
                      )}
                      {doc.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-gray-400" />
                          <span className="truncate">{doc.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleDoctorActive(doc)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {isActive ? (
                          <>
                            <UserCheck size={11} /> Active
                          </>
                        ) : (
                          <>
                            <UserX size={11} /> Inactive
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-gray-400 font-mono">
                        {doc.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
