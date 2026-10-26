import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Save, Upload, RefreshCw, CheckCircle2,
  Phone, Mail, MapPin, Globe, FileText, Image as ImageIcon,
  Stethoscope, Sparkles, Activity,
  Plus, Trash2, Edit2, Check, X, Search, UserPlus, AlertCircle,
  UserCheck, UserX, Loader2, Clock, Receipt, CreditCard,
  MessageSquare, Send, Smartphone, Lock,
  ShieldCheck, Zap,
  CheckCheck, Landmark, Palette, UserCog
} from 'lucide-react';
import StaffManagement from './Staff';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { applyClinicFilter, isMissingClinicIdColumnError } from '../lib/tenancyQuery';
import { useAuth } from '../contexts/AuthContext';
import {
  useClinicSettings,
  getClinicSettings,
  DEFAULT_PROCEDURES,
} from '../lib/clinicSettings';
import {
  ClinicSettings,
  Staff,
  StaffRole,
  SubscriptionPlan,
} from '../lib/types';
import { detectVisitorCurrency, saveManualCurrency } from '../lib/geoPricing';
import { INTERNATIONAL_PLANS } from '../lib/internationalPricing';
import { updateClinicPlan, updateClinicTenantProfile, PLAN_SPECS } from '../lib/tenancy';
import {
  ClinicBadgeIcon,
  PRESET_BADGE_ICONS,
  parseClinicBranding,
} from '../components/ClinicBadgeIcon';
import CreditCardCheckoutModal from '../components/CreditCardCheckoutModal';
import {
  isDemoMode,
  getDemoStaff,
  saveDemoStaff,
  deleteDemoStaff,
  toggleDemoStaff,
} from '../lib/demoData';

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

export type SetupTab =
  | 'profile'
  | 'localization'
  | 'staff_services'
  | 'doctors_services'
  | 'subscriptions';

export interface ClinicSetupProps {
  initialTab?: SetupTab;
}

export default function ClinicSetup({ initialTab = 'profile' }: ClinicSetupProps = {}) {
  const { activeClinic, user } = useAuth();
  const { settings, updateSettings } = useClinicSettings();
  const { theme, setTheme, themeConfig } = useTheme();
  const initialBranding = parseClinicBranding(
    activeClinic?.logo_url !== undefined && activeClinic?.logo_url !== null ? activeClinic.logo_url : settings.logo_url,
    activeClinic?.badge_icon || settings.badge_icon
  );
  const [form, setForm] = useState<ClinicSettings>({
    ...settings,
    clinic_name: activeClinic?.name || settings.clinic_name || '',
    tagline: activeClinic?.tagline !== undefined && activeClinic?.tagline !== null ? activeClinic.tagline : (settings.tagline || ''),
    phone: activeClinic?.phone || settings.phone || '',
    email: activeClinic?.owner_email || settings.email || '',
    address: activeClinic?.address || settings.address || '',
    logo_url: initialBranding.logoUrl,
    badge_icon: initialBranding.badgeIcon,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Clinic settings successfully updated!');
  const [selectedPresetIcon, setSelectedPresetIcon] = useState<string>(
    initialBranding.badgeIcon
  );
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [savedTab, setSavedTab] = useState<string | null>(null);

  const [brandingMode, setBrandingMode] = useState<'badge' | 'logo'>(
    initialBranding.brandingMode
  );
  const isDirtyRef = useRef(false);
  const initialLoadedRef = useRef(false);
  // Navigation tab: Staff & Services are merged, and Subscriptions is placed after it (at last)
  const [activeTab, setActiveTab] = useState<SetupTab>(
    initialTab === 'doctors_services' ? 'staff_services' : initialTab
  );
  const [staffServicesSubTab, setStaffServicesSubTab] = useState<'staff' | 'services'>('staff');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'doctors_services' ? 'staff_services' : initialTab);
    }
  }, [initialTab]);

  // Pricing & Subscription state for activeTab === 'payments'
  // Pricing & Subscription state for activeTab === 'subscriptions'
  const [pricingCurrency, setPricingCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [visitorCountryCode, setVisitorCountryCode] = useState<string>('PK');
  const [devGeoSimulation, setDevGeoSimulation] = useState<'auto' | 'PK' | 'INTL'>('auto');
  const [pricingBillingCycle, setPricingBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlanTier, setSelectedPlanTier] = useState<SubscriptionPlan>(activeClinic?.plan || 'pro');
  const [planSuccessNotice, setPlanSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    detectVisitorCurrency().then((res) => {
      if (isMounted) {
        setPricingCurrency(res.currency === 'PKR' ? 'PKR' : 'USD');
        setVisitorCountryCode(res.countryCode || (res.currency === 'PKR' ? 'PK' : 'US'));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isDevMode = Boolean(
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1'))
  );

  const effectiveCountryCode =
    isDevMode && devGeoSimulation !== 'auto'
      ? (devGeoSimulation === 'PK' ? 'PK' : 'US')
      : visitorCountryCode;

  // Real-time regional evaluation: either detected as PK or manually selected PKR
  const isPakistan = pricingCurrency === 'PKR' || (effectiveCountryCode === 'PK' && pricingCurrency !== 'USD');
  const showCardCheckout = isDevMode && devGeoSimulation === 'auto' ? true : !isPakistan;
  const showPakistanLocalPayment = isDevMode && devGeoSimulation === 'auto' ? true : isPakistan;

  function handlePlanSelectionFlow(planId: SubscriptionPlan) {
    setSelectedPlanTier(planId);
    setShowCardCheckoutModal(true);
  }


  // Clock in clinic timezone
  const [currentTime, setCurrentTime] = useState('');

  // WhatsApp test send simulator state
  const [testMobile, setTestMobile] = useState('+971 50 123 4567');
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [checkoutTestStatus, setCheckoutTestStatus] = useState<string | null>(null);
  const [showCardCheckoutModal, setShowCardCheckoutModal] = useState(false);



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

  // Sync settings state if updated externally, but never overwrite user's active edits
  useEffect(() => {
    const branding = parseClinicBranding(
      activeClinic?.logo_url !== undefined && activeClinic?.logo_url !== null ? activeClinic.logo_url : settings.logo_url,
      activeClinic?.badge_icon || settings.badge_icon
    );

    if (!initialLoadedRef.current) {
      setForm((prev) => ({
        ...settings,
        clinic_name: activeClinic?.name || settings.clinic_name || prev.clinic_name,
        tagline: activeClinic?.tagline !== undefined && activeClinic?.tagline !== null ? activeClinic.tagline : (settings.tagline || prev.tagline),
        phone: activeClinic?.phone || settings.phone || prev.phone,
        email: activeClinic?.owner_email || settings.email || prev.email,
        address: activeClinic?.address || settings.address || prev.address,
        logo_url: branding.logoUrl,
        badge_icon: branding.badgeIcon,
      }));
      setSelectedPresetIcon(branding.badgeIcon);
      setBrandingMode(branding.brandingMode);
      initialLoadedRef.current = true;
      return;
    }

    if (!isDirtyRef.current && !savingTab) {
      setForm((prev) => ({
        ...settings,
        clinic_name: activeClinic?.name || settings.clinic_name || prev.clinic_name,
        tagline: activeClinic?.tagline !== undefined && activeClinic?.tagline !== null ? activeClinic.tagline : (settings.tagline || prev.tagline),
        phone: activeClinic?.phone || settings.phone || prev.phone,
        email: activeClinic?.owner_email || settings.email || prev.email,
        address: activeClinic?.address || settings.address || prev.address,
        logo_url: branding.logoUrl,
        badge_icon: branding.badgeIcon,
      }));
      setSelectedPresetIcon(branding.badgeIcon);
      setBrandingMode(branding.brandingMode);
    }
  }, [settings, savingTab, activeClinic?.name, activeClinic?.tagline, activeClinic?.phone, activeClinic?.owner_email, activeClinic?.address, activeClinic?.logo_url, activeClinic?.badge_icon]);

  // Load fresh canonical clinic identity directly from Supabase clinics table
  useEffect(() => {
    if (!activeClinic?.id) return;
    let isSubscribed = true;
    supabase
      .from('clinics')
      .select('*')
      .eq('id', activeClinic.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isSubscribed) return;
        if (data && !error && !isDirtyRef.current) {
          const branding = parseClinicBranding(data.logo_url, (data as any).badge_icon || settings.badge_icon);
          setForm((prev) => ({
            ...prev,
            clinic_name: data.name || prev.clinic_name,
            tagline: data.tagline !== undefined && data.tagline !== null ? data.tagline : prev.tagline,
            phone: data.phone || prev.phone,
            email: data.owner_email || prev.email,
            address: data.address || prev.address,
            logo_url: branding.logoUrl,
            badge_icon: branding.badgeIcon,
          }));
          setSelectedPresetIcon(branding.badgeIcon);
          setBrandingMode(branding.brandingMode);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeClinic?.id]);

  function notifySuccess(msg: string) {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  }

  function handleSaveLocalization(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSavingTab('localization');
    updateSettings(form);
    isDirtyRef.current = false;
    setSavingTab(null);
    setSavedTab('localization');
    notifySuccess('Tooth notation, time zone & VAT settings saved and applied!');
    setTimeout(() => {
      setSavedTab((curr) => curr === 'localization' ? null : curr);
    }, 2500);
  }

  function handleSaveWhatsApp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSavingTab('whatsapp');
    updateSettings(form);
    setSavingTab(null);
    setSavedTab('whatsapp');
    notifySuccess('WhatsApp Cloud API & automated triggers saved and applied!');
    setTimeout(() => {
      setSavedTab((curr) => curr === 'whatsapp' ? null : curr);
    }, 2500);
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



  // High-performance canvas-based image downscaler & compressor (max 320x320)
  // Ensures uploaded logos never exceed browser localStorage quotas (~25KB typical)
  function compressImageFile(file: File, maxWidth = 320, maxHeight = 320, quality = 0.88): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image preview'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
          const dataUrl = canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, 240, 240, 0.85);
      isDirtyRef.current = true;
      setForm((prev) => ({ ...prev, logo_url: dataUrl }));
      setBrandingMode('logo');
    } catch (err) {
      console.error('Error optimizing image:', err);
      alert('Could not process image file. Please try another image.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.clinic_name.trim();
    if (!trimmedName) {
      alert('Clinic Name is required');
      return;
    }
    if (!form.phone?.trim()) {
      alert('Contact Phone / Mobile number is required');
      return;
    }
    if (!form.email?.trim()) {
      alert('Clinic Email address is required');
      return;
    }
    if (!form.address?.trim()) {
      alert('Clinic Full Address is required');
      return;
    }

    setSavingTab('profile');
    const activeBadge = form.badge_icon || selectedPresetIcon || 'stethoscope';
    const activeLogo = brandingMode === 'logo' ? (form.logo_url?.trim() || '') : '';
    const dbLogoUrl = brandingMode === 'logo' && activeLogo ? activeLogo : `badge:${activeBadge}`;

    const updatedForm: ClinicSettings = {
      ...form,
      clinic_name: trimmedName,
      tagline: form.tagline?.trim() || '',
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      website: form.website?.trim() || '',
      tax_number: form.tax_number?.trim() || '',
      badge_icon: activeBadge,
      logo_url: activeLogo,
    };

    isDirtyRef.current = false;
    setForm(updatedForm);
    updateSettings(updatedForm);

    // Synchronize tenant store, Supabase remote clinics table, and activeClinic in AuthContext
    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    await updateClinicTenantProfile(clinicId, {
      name: updatedForm.clinic_name,
      tagline: updatedForm.tagline,
      logo_url: dbLogoUrl,
      address: updatedForm.address,
      phone: updatedForm.phone,
      owner_email: updatedForm.email,
      website: updatedForm.website,
      tax_number: updatedForm.tax_number,
      badge_icon: activeBadge,
    });

    setSavingTab(null);
    setSavedTab('profile');
    notifySuccess(`Clinic identity "${updatedForm.clinic_name}" successfully saved & synchronized!`);
    setTimeout(() => {
      setSavedTab((curr) => curr === 'profile' ? null : curr);
    }, 2500);
  }

  async function handleResetAll() {
    if (confirm('Reset clinic profile to current database identity?')) {
      if (activeClinic?.id) {
        const { data } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', activeClinic.id)
          .maybeSingle();
        if (data) {
          const branding = parseClinicBranding(data.logo_url, (data as any).badge_icon);
          const resetForm: ClinicSettings = {
            ...form,
            clinic_name: data.name || '',
            tagline: data.tagline || '',
            phone: data.phone || '',
            email: data.owner_email || '',
            address: data.address || '',
            logo_url: branding.logoUrl,
            badge_icon: branding.badgeIcon,
          };
          isDirtyRef.current = false;
          setSelectedPresetIcon(branding.badgeIcon);
          setBrandingMode(branding.brandingMode);
          setForm(resetForm);
          updateSettings(resetForm);
          notifySuccess('Clinic profile reloaded from database.');
          return;
        }
      }
      const resetDefaults = getClinicSettings();
      setForm({ ...resetDefaults });
      updateSettings({ ...resetDefaults });
      notifySuccess('Clinic profile restored.');
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

  // Filtered views
  const filteredProcedures = currentProcedures.filter((p) =>
    p.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Building2 style={{ color: 'var(--primary-color)' }} size={26} />
            Clinic Setup & Clinical Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure clinic profile branding, clinical procedures, attending doctors & staff, and regional localization
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

      {/* Floating Viewport Toast Notification (Always in view) */}
      {savedSuccess && (
        <div className="fixed top-6 right-6 z-[100] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 drop-shadow-2xl">
          <div
            className="text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 backdrop-blur-md border border-white/20"
            style={{ background: 'var(--dossier-gradient)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={19} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Saved & Applied
                </h4>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-white/90 mt-0.5 font-medium leading-relaxed">
                {successMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSavedSuccess(false)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Banner (In-Page) */}
      {savedSuccess && (
        <div
          className="p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold shadow-xs animate-in fade-in duration-200 border"
          style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} style={{ color: 'var(--primary-color)' }} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
            style={{ background: 'rgba(255,255,255,0.8)', color: 'var(--badge-text)' }}
          >
            Active & Synchronized
          </span>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={activeTab === 'profile' ? { background: 'var(--primary-color)' } : {}}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Building2 size={14} />
          Clinic Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('localization')}
          style={activeTab === 'localization' ? { background: 'var(--primary-color)' } : {}}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'localization'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Globe size={14} />
          Tooth Notation, Time Zone & VAT
          <span
            className="px-1.5 py-0.2 rounded-md text-[10px] font-bold"
            style={{
              background: activeTab === 'localization' ? 'rgba(255,255,255,0.2)' : 'var(--badge-bg)',
              color: activeTab === 'localization' ? 'white' : 'var(--badge-text)',
            }}
          >
            {form.tooth_notation === 'universal' ? 'UNIVERSAL' : 'FDI'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff_services')}
          style={activeTab === 'staff_services' || activeTab === 'doctors_services' ? { background: 'var(--primary-color)' } : {}}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'staff_services' || activeTab === 'doctors_services'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <UserCog size={14} />
          Staff & Services
          <span
            className="px-1.5 py-0.2 rounded-md text-[10px] font-mono"
            style={{
              background: activeTab === 'staff_services' || activeTab === 'doctors_services' ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
              color: activeTab === 'staff_services' || activeTab === 'doctors_services' ? 'white' : '#374151',
            }}
          >
            Staff & {currentProcedures.length} Services
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          style={activeTab === 'subscriptions' ? { background: 'var(--primary-color)' } : {}}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subscriptions'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <CreditCard size={14} />
          Subscription Plans
          {activeClinic?.plan && (
            <span
              className="px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: activeTab === 'subscriptions' ? 'rgba(255,255,255,0.2)' : 'var(--badge-bg)',
                color: activeTab === 'subscriptions' ? 'white' : 'var(--badge-text)',
              }}
            >
              {activeClinic.plan}
            </span>
          )}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, clinic_name: e.target.value });
                  }}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, tagline: e.target.value });
                  }}
                  placeholder="e.g. Dental & Aesthetics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>
            </div>

            {/* Core App Theme & Design System */}
            <div className="space-y-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={14} className="text-sky-600" />
                    Workspace Color Theme (Design System)
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Switch between the default landing page aesthetic and the warm organic clinic theme. Changes apply across the entire portal instantly.
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto"
                  style={{
                    background: theme === 'blue' ? '#f0f9ff' : '#f2f7ef',
                    borderColor: theme === 'blue' ? '#bae6fd' : '#c4dcb4',
                    color: theme === 'blue' ? '#0369a1' : '#2a401d',
                  }}
                >
                  Active: {themeConfig.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Modern Dental Blue & White */}
                <div
                  onClick={() => setTheme('blue')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'blue'
                      ? 'border-sky-600 bg-sky-50/40 shadow-sm ring-2 ring-sky-500/20'
                      : 'border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌊</span>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Modern Dental Blue & White</h5>
                        <p className="text-[10px] text-sky-700 font-semibold">Landing Page & Cloud Portal Default</p>
                      </div>
                    </div>
                    {theme === 'blue' && (
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Crisp, professional high-tech aesthetic matching the public website, dental sky blues, and slate canvas.
                  </p>
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#0284c7] shadow-2xs" title="Brand Sky Blue (#0284c7)" />
                    <span className="w-5 h-5 rounded-md bg-[#0c4a6e] shadow-2xs" title="Dental Navy (#0c4a6e)" />
                    <span className="w-5 h-5 rounded-md bg-[#f0f9ff] border border-sky-200" title="Soft Blue Accent (#f0f9ff)" />
                    <span className="w-5 h-5 rounded-md bg-[#f8fafc] border border-slate-200" title="Slate 50 Background (#f8fafc)" />
                    <span className="w-5 h-5 rounded-md bg-white border border-slate-200" title="Pure White (#ffffff)" />
                  </div>
                </div>

                {/* Option 2: Warm Organic Olive & Cream */}
                <div
                  onClick={() => setTheme('olive')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'olive'
                      ? 'border-emerald-700 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/20'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌿</span>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Warm Organic Olive & Cream</h5>
                        <p className="text-[10px] text-emerald-800 font-semibold">Earthy Holistic Clinical Theme</p>
                      </div>
                    </div>
                    {theme === 'olive' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Warm, calming organic clinical ambience with forest olive tones and soothing antique cream surfaces.
                  </p>
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#3c5e27] shadow-2xs" title="Forest Olive (#3c5e27)" />
                    <span className="w-5 h-5 rounded-md bg-[#2a401d] shadow-2xs" title="Dark Olive (#2a401d)" />
                    <span className="w-5 h-5 rounded-md bg-[#e1edd9] border border-emerald-200" title="Olive Tint (#e1edd9)" />
                    <span className="w-5 h-5 rounded-md bg-[#f7f4ed] border border-stone-200" title="Antique Cream (#f7f4ed)" />
                    <span className="w-5 h-5 rounded-md bg-white border border-stone-200" title="Pure White (#ffffff)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Logo / Badge Choice & Customization */}
            <div className="space-y-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Clinic Branding & Iconography
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Choose between a curated medical vector badge or your own custom clinic logo.
                  </p>
                </div>
                {/* 2-Option Mode Switcher */}
                <div className="inline-flex rounded-xl p-1 bg-white border border-gray-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      isDirtyRef.current = true;
                      setBrandingMode('badge');
                    }}
                    style={brandingMode === 'badge' ? { background: 'var(--primary-color)' } : {}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      brandingMode === 'badge'
                        ? 'text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Stethoscope size={13} />
                    Medical Badge
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      isDirtyRef.current = true;
                      setBrandingMode('logo');
                    }}
                    style={brandingMode === 'logo' ? { background: 'var(--primary-color)' } : {}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      brandingMode === 'logo'
                        ? 'text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon size={13} />
                    Custom Logo
                  </button>
                </div>
              </div>

              {/* Active Preview & Controls */}
              <div className="flex items-start gap-4">
                {/* Visual Avatar Preview */}
                <div
                  className="w-16 h-16 rounded-2xl text-white flex items-center justify-center overflow-hidden border-2 shadow-md flex-shrink-0 transition-all"
                  style={{ background: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                >
                  {brandingMode === 'logo' && form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Clinic Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ClinicBadgeIcon
                      iconId={form.badge_icon || selectedPresetIcon}
                      size={32}
                      className="text-white drop-shadow-sm transition-transform duration-200"
                    />
                  )}
                </div>

                {/* Sub-panel based on brandingMode */}
                {brandingMode === 'badge' ? (
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Select Medical Badge Style
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                        Selected: {PRESET_BADGE_ICONS.find(p => p.id === (form.badge_icon || selectedPresetIcon))?.label || 'Stethoscope'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {PRESET_BADGE_ICONS.map((p) => {
                        const IconComp = p.icon;
                        const isSelected = (form.badge_icon || selectedPresetIcon) === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              isDirtyRef.current = true;
                              setSelectedPresetIcon(p.id);
                              setForm((prev) => ({ ...prev, badge_icon: p.id }));
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-emerald-800 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30 scale-[1.02]'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                          >
                            <IconComp size={14} />
                            <span>{p.label}</span>
                            {isSelected && <Check size={12} className="ml-0.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs">
                        <Upload size={14} className="text-emerald-700" /> Upload Image File (PNG/JPG)
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
                          onClick={() => {
                            isDirtyRef.current = true;
                            setForm((prev) => ({ ...prev, logo_url: '' }));
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Clear Logo
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ImageIcon size={13} className="text-gray-400" />
                      <input
                        type="url"
                        value={form.logo_url || ''}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setForm({ ...form, logo_url: e.target.value });
                        }}
                        placeholder="Or paste image URL (https://...)"
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-xs text-gray-800 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Uploaded logos are automatically resized and compressed to keep invoices and receipts loading blazing fast.
                    </p>
                  </div>
                )}
              </div>
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
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setForm({ ...form, phone: e.target.value });
                      }}
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
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setForm({ ...form, email: e.target.value });
                      }}
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
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setForm({ ...form, address: e.target.value });
                      }}
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
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setForm({ ...form, website: e.target.value });
                      }}
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
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setForm({ ...form, tax_number: e.target.value });
                    }}
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
                disabled={savingTab === 'profile'}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md ${
                  savedTab === 'profile'
                    ? 'bg-emerald-600 ring-2 ring-emerald-400 ring-offset-2 scale-[1.02]'
                    : 'hover:opacity-90 active:scale-[0.98]'
                }`}
                style={savedTab === 'profile' ? undefined : { background: 'var(--primary-color, #0284c7)' }}
              >
                {savingTab === 'profile' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving Identity...
                  </>
                ) : savedTab === 'profile' ? (
                  <>
                    <CheckCircle2 size={15} className="text-white animate-bounce" /> Saved & Applied!
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Clinic Identity
                  </>
                )}
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
                <div className="p-4" style={{ background: 'var(--sidebar-bg, #0c4a6e)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 transition-all">
                        {brandingMode === 'logo' && form.logo_url ? (
                          <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ClinicBadgeIcon
                            iconId={form.badge_icon || selectedPresetIcon}
                            size={20}
                            className="w-5 h-5 text-white"
                          />
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden transition-all"
                      style={{ background: 'var(--primary-color, #0284c7)' }}
                    >
                      {brandingMode === 'logo' && form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ClinicBadgeIcon
                          iconId={form.badge_icon || selectedPresetIcon}
                          size={16}
                          className="w-4 h-4 text-white"
                        />
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
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Configurable
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
                  onClick={() => {
                    isDirtyRef.current = true;
                    const nextForm = { ...form, tooth_notation: 'fdi' as const };
                    setForm(nextForm);
                    updateSettings(nextForm);
                    notifySuccess('Switched to FDI Two-Digit Notation (11–48)!');
                  }}
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
                  onClick={() => {
                    isDirtyRef.current = true;
                    const nextForm = { ...form, tooth_notation: 'universal' as const };
                    setForm(nextForm);
                    updateSettings(nextForm);
                    notifySuccess('Switched to Universal Numbering System (1–32)!');
                  }}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, timezone: e.target.value });
                  }}
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
                    onClick={() => {
                      isDirtyRef.current = true;
                      setForm({
                        ...form,
                        tax_label: preset.label,
                        tax_rate: preset.rate,
                        currency_symbol: preset.symbol,
                      });
                    }}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, tax_label: e.target.value });
                  }}
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
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 });
                    }}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, tax_number: e.target.value });
                  }}
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
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setForm({ ...form, currency_symbol: e.target.value });
                  }}
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
              disabled={savingTab === 'localization'}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md ${
                savedTab === 'localization'
                  ? 'bg-emerald-600 ring-2 ring-emerald-400 ring-offset-2 scale-[1.02]'
                  : 'hover:opacity-90 active:scale-[0.98]'
              }`}
              style={savedTab === 'localization' ? undefined : { background: 'var(--primary-color, #0284c7)' }}
            >
              {savingTab === 'localization' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving Settings...
                </>
              ) : savedTab === 'localization' ? (
                <>
                  <CheckCircle2 size={15} className="text-white animate-bounce" /> Saved & Applied!
                </>
              ) : (
                <>
                  <Save size={15} /> Save Tooth Notation, Time Zone & VAT Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: STAFF & SERVICES MANAGEMENT                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'staff_services' || activeTab === 'doctors_services') && (
        <div className="space-y-6">
          {/* Sub-tab Pill Switcher for Staff & Clinical Services */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 card-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserCog style={{ color: 'var(--primary-color)' }} size={20} />
                Staff & Clinical Services Management
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage attending doctors, clinical staff members, license seats, and procedures catalog in a unified workspace.
              </p>
            </div>

            <div className="inline-flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setStaffServicesSubTab('staff')}
                style={staffServicesSubTab === 'staff' ? { background: 'var(--primary-color)' } : {}}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  staffServicesSubTab === 'staff'
                    ? 'text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCog size={15} />
                <span>Clinic Staff & Attending Doctors</span>
              </button>

              <button
                type="button"
                onClick={() => setStaffServicesSubTab('services')}
                style={staffServicesSubTab === 'services' ? { background: 'var(--primary-color)' } : {}}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                  staffServicesSubTab === 'services'
                    ? 'text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity size={15} />
                <span>Clinical Services / Procedures</span>
                <span
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono"
                  style={{
                    background: staffServicesSubTab === 'services' ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                    color: staffServicesSubTab === 'services' ? 'white' : '#374151',
                  }}
                >
                  {currentProcedures.length}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-panel 1: Clinic Staff & Attending Doctors (Powered by Staff Module) */}
          {staffServicesSubTab === 'staff' && (
            <StaffManagement embedded={true} />
          )}

          {/* Sub-panel 2: Clinical Services / Procedures */}
          {staffServicesSubTab === 'services' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
          {/* Header & Reset Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity style={{ color: 'var(--primary-color)' }} size={18} />
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] text-gray-900 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={!newProcedureName.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                style={{ background: 'var(--primary-color, #0284c7)' }}
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
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--primary-color)]/20"
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
                  style={{ color: 'var(--primary-color)' }}
                  className="hover:underline"
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
                            className="flex-1 px-3 py-1.5 rounded-lg border text-xs text-gray-900 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30"
                            style={{ borderColor: 'var(--primary-color)' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditProcedure(idx)}
                            style={{ background: 'var(--primary-color)' }}
                            className="p-1.5 rounded-lg text-white hover:opacity-90 transition-colors shadow-xs"
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
                            <span
                              className="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
                            >
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
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[var(--primary-color)] hover:bg-[var(--primary-50)] transition-colors"
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SUBSCRIPTION PLANS & PAYMENT METHOD HUB (PLACED LAST)        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Main Container */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
                  >
                    💳
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    Subscription Plans & Payment Methods
                  </h3>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
                  >
                    Active Plan: {PLAN_SPECS[activeClinic?.plan || selectedPlanTier].name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  Choose the plan tier that fits your practice capacity and staff team size. Pricing is automatically tailored to your region with direct local bank transfer for Pakistan and card checkout for international clinics.
                </p>
              </div>

              {/* Currency & Billing Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Currency Switcher (USD vs PKR) */}
                <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPricingCurrency('USD');
                      setVisitorCountryCode('US');
                      saveManualCurrency('USD');
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      pricingCurrency === 'USD'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>USD ($)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPricingCurrency('PKR');
                      setVisitorCountryCode('PK');
                      saveManualCurrency('PKR');
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      pricingCurrency === 'PKR'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>🇵🇰</span>
                    <span>PKR (Rs.)</span>
                  </button>
                </div>

                {/* Cadence Switcher (Monthly vs Annual) */}
                <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPricingBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      pricingBillingCycle === 'monthly'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingBillingCycle('annual')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      pricingBillingCycle === 'annual'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>Annual</span>
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded-md">Save 20%</span>
                  </button>
                </div>
              </div>
            </div>


            {/* Plan Upgrade Success Banner */}
            {planSuccessNotice && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                  <span>{planSuccessNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanSuccessNotice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Pricing Plans Grid (Starter, Pro, Enterprise) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {INTERNATIONAL_PLANS.map((plan) => {
                const isCurrent = (activeClinic?.plan || 'pro') === plan.id;
                const isSelected = selectedPlanTier === plan.id;
                const priceData = plan.pricing[pricingCurrency];
                const displayPrice =
                  pricingBillingCycle === 'annual'
                    ? priceData.formattedAnnualMonthly
                    : priceData.formattedMonthly;
                const symbol = pricingCurrency === 'PKR' ? 'Rs. ' : '$';

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelectionFlow(plan.id)}
                    className={`rounded-2xl p-5 flex flex-col justify-between transition-all relative border-2 text-left cursor-pointer hover:shadow-lg ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/40 shadow-md ring-2 ring-sky-500/10'
                        : 'border-gray-200 bg-white hover:border-sky-300 shadow-xs'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 right-4">
                        <span
                          className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white shadow-xs ${
                            plan.id === 'pro'
                              ? 'bg-sky-600'
                              : plan.id === 'starter'
                              ? 'bg-emerald-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Title & Tagline */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-gray-900">{plan.name}</h4>
                          {isCurrent && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Active Tier
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug min-h-[28px]">{plan.tagline}</p>
                      </div>

                      {/* Price Figure */}
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display">
                            {displayPrice}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">/ mo</span>
                        </div>
                        {pricingBillingCycle === 'annual' && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Billed annually ({symbol}{priceData.annualTotal.toLocaleString()}/yr)
                          </p>
                        )}
                        <p className="text-[10px] text-sky-800 font-semibold mt-1 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          ⚡ {priceData.competitorComparison}
                        </p>
                      </div>

                      {/* Quotas */}
                      <div className="grid grid-cols-2 gap-2 text-center text-xs mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Max Seats</span>
                          <strong className="text-gray-800 text-xs">{plan.maxSeats} Doctor / Staff</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px] uppercase font-semibold">Concurrent</span>
                          <strong className="text-gray-800 text-xs">{plan.maxSessions} Active Logins</strong>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-2 mb-5 text-[11px] text-gray-600">
                        {plan.features.slice(0, 5).map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isCurrent ? (
                        <div className="space-y-1">
                          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default">
                            <Check size={14} className="text-emerald-700" />
                            <span>Current Active Plan</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlanSelectionFlow(plan.id);
                            }}
                            className="w-full text-center text-[10px] text-sky-700 font-semibold hover:underline"
                          >
                            {showCardCheckout ? 'Renew or Pay via Card ➔' : 'Renew / Transfer via Bank or Raast ➔'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanSelectionFlow(plan.id);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          {showCardCheckout ? (
                            <>
                              <CreditCard size={14} />
                              <span>Checkout {plan.name}</span>
                            </>
                          ) : (
                            <>
                              <Landmark size={14} />
                              <span>Select & Pay {plan.name}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Settlement Methods */}
            <div id="payment-methods-section" className="space-y-4">
              {/* Development Mode Multi-Region Testing Bar */}
              {isDevMode && (
                <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider">
                      🛠️ Dev Mode (Localhost)
                    </span>
                    <span className="text-[11px] font-medium text-amber-900">
                      Both Pakistan Bank Transfer & International Card Checkout are enabled for testing.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold shrink-0">
                    <span className="text-gray-500 font-normal">Simulate IP:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDevGeoSimulation('auto');
                        setPricingCurrency(visitorCountryCode === 'PK' ? 'PKR' : 'USD');
                      }}
                      className={`px-2 py-1 rounded-lg border transition-all ${
                        devGeoSimulation === 'auto'
                          ? 'bg-amber-900 text-white border-amber-900 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      All (Dev)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDevGeoSimulation('PK');
                        setPricingCurrency('PKR');
                      }}
                      className={`px-2 py-1 rounded-lg border transition-all ${
                        devGeoSimulation === 'PK'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      🇵🇰 Pakistan Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDevGeoSimulation('INTL');
                        setPricingCurrency('USD');
                      }}
                      className={`px-2 py-1 rounded-lg border transition-all ${
                        devGeoSimulation === 'INTL'
                          ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      🌐 International Only
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`grid ${
                  showCardCheckout && showPakistanLocalPayment
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 max-w-2xl mx-auto'
                } gap-5`}
              >
                {/* Option 1: Credit & Debit Card Checkout (Shown only outside Pakistan or in Dev Mode) */}
                {showCardCheckout && (
                  <div className="p-5 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50/60 via-white to-indigo-50/40 space-y-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <CreditCard size={18} className="text-sky-600" />
                          Credit & Debit Card Checkout
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                          <ShieldCheck size={11} />
                          International Checkout
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed">
                        Automated online subscription checkout for <strong>Visa, Mastercard, American Express, Apple Pay, & Google Pay</strong>. International VAT, compliance, and multi-currency invoicing handled seamlessly.
                      </p>

                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-700 pt-1">
                        <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 text-gray-800">
                          💳 Visa, MC, Amex
                        </span>
                        <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 text-gray-800">
                          🍏 Apple Pay & GPay
                        </span>
                        <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 text-gray-800">
                          🛡️ 256-Bit SSL Encrypted
                        </span>
                        <span className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 text-gray-800">
                          ⚡ Instant Activation
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200/80 text-sky-950 text-xs flex items-start gap-2.5 mt-2">
                        <Sparkles size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-snug">
                          <span className="font-bold text-sky-950 block">
                            Selected Plan: {PLAN_SPECS[selectedPlanTier].name} ({pricingBillingCycle === 'annual' ? 'Annual Billing' : 'Monthly'})
                          </span>
                          {pricingCurrency === 'PKR'
                            ? `Rs. ${(pricingBillingCycle === 'annual' ? (selectedPlanTier === 'starter' ? 17270 : selectedPlanTier === 'pro' ? 33590 : 57590) : (selectedPlanTier === 'starter' ? 1799 : selectedPlanTier === 'pro' ? 3499 : 5999)).toLocaleString()} total • ${PLAN_SPECS[selectedPlanTier].max_seats} Doctor Seats & ${PLAN_SPECS[selectedPlanTier].max_sessions} Concurrent Logins`
                            : `$${pricingBillingCycle === 'annual' ? (selectedPlanTier === 'starter' ? 278 : selectedPlanTier === 'pro' ? 758 : 1430) : (selectedPlanTier === 'starter' ? 29 : selectedPlanTier === 'pro' ? 79 : 149)} total • ${PLAN_SPECS[selectedPlanTier].max_seats} Doctor Seats & ${PLAN_SPECS[selectedPlanTier].max_sessions} Concurrent Logins`}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCardCheckoutModal(true)}
                        className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.99] transition-all"
                        style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                      >
                        <CreditCard size={15} />
                        <span>Checkout {PLAN_SPECS[selectedPlanTier].name} via Card</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Option 2: Direct Bank Transfer (Shown only inside Pakistan or in Dev Mode) */}
                {showPakistanLocalPayment && (
                  <div id="pakistan-bank-payment-section" className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                          <Landmark size={18} className="text-emerald-700" />
                          Direct Bank / NayaPay / Raast (Pakistan Local Clinics)
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                          Pakistan Clinics
                        </span>
                      </div>

                      <p className="text-xs text-emerald-900/90 leading-relaxed">
                        Direct local bank transfer for Pakistani clinics via <strong>NayaPay, UBL, Raast Instant Payment, or EasyPaisa</strong> with zero platform fees.
                      </p>

                      {/* Selected plan price notice */}
                      <div className="p-2.5 bg-emerald-100/70 border border-emerald-300/80 rounded-xl text-emerald-950 text-xs">
                        <span className="font-bold">Transfer Amount for {PLAN_SPECS[selectedPlanTier].name}: </span>
                        <strong className="text-emerald-900 text-sm">
                          Rs. {(pricingBillingCycle === 'annual' ? (selectedPlanTier === 'starter' ? 17270 : selectedPlanTier === 'pro' ? 33590 : 57590) : (selectedPlanTier === 'starter' ? 1799 : selectedPlanTier === 'pro' ? 3499 : 5999)).toLocaleString()}
                        </strong>
                        <span className="text-[11px] text-emerald-800 ml-1">
                          ({pricingBillingCycle === 'annual' ? 'Annual Billing' : 'Monthly'})
                        </span>
                      </div>

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

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={`https://wa.me/923093622732?text=${encodeURIComponent(
                          `Hi, I am sending the subscription payment receipt for ${form.clinic_name || 'my clinic'} for the ${PLAN_SPECS[selectedPlanTier].name} (${pricingBillingCycle} billing). Please activate my subscription.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <MessageSquare size={14} />
                        <span>Send Receipt on WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanTier(selectedPlanTier);
                          setShowCardCheckoutModal(true);
                        }}
                        className="py-2.5 px-4 rounded-xl border-2 border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Landmark size={14} />
                        <span>View Modal & Transfer ➔</span>
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Credit & Debit Card Checkout Modal */}
      <CreditCardCheckoutModal
        isOpen={showCardCheckoutModal}
        onClose={() => setShowCardCheckoutModal(false)}
        planId={selectedPlanTier}
        initialBillingCycle={pricingBillingCycle}
        currency={pricingCurrency}
        clinicId={activeClinic?.id || ''}
        clinicName={activeClinic?.name || form.clinic_name || ''}
        customerEmail={activeClinic?.owner_email || user?.email || ''}
        onSuccess={({ transactionId, planId }) => {
          if (activeClinic?.id) {
            updateClinicPlan(activeClinic.id, planId);
          }
          setPlanSuccessNotice(`Payment Authorized! Activated ${PLAN_SPECS[planId].name} plan (Ref: ${transactionId}).`);
          setTimeout(() => setPlanSuccessNotice(null), 5000);
        }}
      />
    </div>
  );
}
