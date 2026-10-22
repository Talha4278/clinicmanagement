import { useState, useEffect } from 'react';
import { ClinicSettings } from './types';

export const DEFAULT_PROCEDURES: string[] = [
  'General Consultation',
  'Scaling & Polishing',
  'Teeth Whitening',
  'Root Canal Treatment',
  'Dental Fillings',
  'Crown & Bridge',
  'Tooth Extraction',
  'Orthodontic Checkup',
  'Facial Aesthetics / Botox',
  'Dental Implants',
  'Pediatric Dentistry',
];

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinic_name: '',
  tagline: '',
  logo_url: '',
  badge_icon: 'stethoscope',
  address: '',
  email: '',
  phone: '',
  website: '',
  tax_number: '',
  tax_rate: 5,
  tax_label: 'GST / Tax (5%)',
  timezone: 'Asia/Karachi',
  tooth_notation: 'fdi',
  currency_symbol: 'Rs. ',
  whatsapp_config: {
    enabled: true,
    provider: 'cloud_api',
    business_number: '',
    api_endpoint: 'https://graph.facebook.com/v19.0',
    api_key: '',
    phone_number_id: '109283746501928',
    waba_id: '827364519283746',
    account_sid: '',
    auth_token: '',
    twilio_phone_number: '',
    webhook_url: 'https://api.clinsyst.com/v1/webhooks/whatsapp',
    webhook_verify_token: 'clinsyst_wa_verify_2026',
    auto_remind_hours_before: 24,
  },
  payment_gateway_config: {
    enabled: true,
    provider: 'manual',
    bank_name: 'NayaPay / UBL (United Bank Limited)',
    account_title: 'Talha Sarfraz Malik',
    account_number_iban: 'PK66UNIL0109000367251495',
    raast_id: '0334634278',
    jazzcash_number: '0334634278',
    easypaisa_number: '0334634278',
    whatsapp_number: '03093622732',
    manual_instructions: 'Please send payment receipt screenshot on WhatsApp to 03093622732 after transferring.',
    currency: 'PKR',
    lemon_squeezy_store_id: '490757',
    test_mode: false,
    price_ids: {
      starter_monthly: '1463186',
      starter_annual: '1463186',
      pro_monthly: '1463186',
      pro_annual: '1463186',
      enterprise_monthly: '1463186',
      enterprise_annual: '1463186',
    },
  },
  procedures: DEFAULT_PROCEDURES,
};

const LEGACY_STORAGE_KEY = 'dentivista_clinic_settings';
const EVENT_NAME = 'clinic-settings-updated';

function getSettingsStorageKey(clinicId?: string | null): string {
  try {
    const rawActiveId = clinicId || localStorage.getItem('clinsyst_active_clinic_id');
    if (rawActiveId) {
      return `dentivista_clinic_${rawActiveId}_settings`;
    }
  } catch {}
  return LEGACY_STORAGE_KEY;
}

export function getClinicSettings(explicitClinicId?: string | null): ClinicSettings {
  try {
    const activeId = explicitClinicId || localStorage.getItem('clinsyst_active_clinic_id');
    let currentTenant: any = null;
    try {
      const activeTenantRaw = localStorage.getItem('clinsyst_tenants');
      if (activeTenantRaw) {
        const tenants = JSON.parse(activeTenantRaw);
        if (Array.isArray(tenants)) {
          currentTenant = activeId
            ? tenants.find((t: any) => t.id === activeId)
            : tenants[0];
        }
      }
    } catch {}

    const defaultBase: ClinicSettings = {
      ...DEFAULT_CLINIC_SETTINGS,
      clinic_name: currentTenant?.name || '',
      tagline: currentTenant?.tagline !== undefined && currentTenant?.tagline !== null ? currentTenant.tagline : '',
      logo_url: currentTenant?.logo_url || '',
      address: currentTenant?.address || '',
      email: currentTenant?.owner_email || '',
      phone: currentTenant?.phone || '',
      website: currentTenant?.slug ? `www.${currentTenant.slug}.com` : '',
    };

    const key = getSettingsStorageKey(activeId);
    let raw = localStorage.getItem(key);

    // Fall back to legacy key ONLY if explicitly looking for default demo clinic or when activeId is 'clinic-dentivista-01'
    if (!raw && (!activeId || activeId === 'clinic-dentivista-01')) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if ('doctors' in parsed) {
        delete parsed.doctors;
      }

      // Check legacy storage for tooth_notation if missing in scoped settings
      let fallbackNotation: 'fdi' | 'universal' | undefined = parsed.tooth_notation;
      if (!fallbackNotation && key !== LEGACY_STORAGE_KEY) {
        try {
          const legRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legRaw) {
            const legParsed = JSON.parse(legRaw);
            if (legParsed.tooth_notation === 'universal' || legParsed.tooth_notation === 'fdi') {
              fallbackNotation = legParsed.tooth_notation;
            }
          }
        } catch {}
      }

      const effectiveNotation = (fallbackNotation === 'universal' || fallbackNotation === 'fdi')
        ? fallbackNotation
        : (defaultBase.tooth_notation || 'fdi');

      return {
        ...defaultBase,
        ...parsed,
        // Priority for clinic identity: current tenant in store (synced from database) takes precedence over stale/cached settings
        clinic_name: (currentTenant?.name) ? currentTenant.name : ((parsed.clinic_name && parsed.clinic_name.trim()) ? parsed.clinic_name : defaultBase.clinic_name),
        tagline: (currentTenant?.tagline !== undefined && currentTenant?.tagline !== null) ? currentTenant.tagline : (parsed.tagline !== undefined ? parsed.tagline : defaultBase.tagline),
        logo_url: (currentTenant?.logo_url !== undefined && currentTenant?.logo_url !== null) ? currentTenant.logo_url : (parsed.logo_url !== undefined ? parsed.logo_url : defaultBase.logo_url),
        address: (currentTenant?.address !== undefined && currentTenant?.address !== null) ? currentTenant.address : (parsed.address !== undefined ? parsed.address : defaultBase.address),
        phone: (currentTenant?.phone !== undefined && currentTenant?.phone !== null) ? currentTenant.phone : (parsed.phone !== undefined ? parsed.phone : defaultBase.phone),
        email: (currentTenant?.owner_email !== undefined && currentTenant?.owner_email !== null) ? currentTenant.owner_email : (parsed.email !== undefined ? parsed.email : defaultBase.email),
        website: parsed.website !== undefined ? parsed.website : defaultBase.website,
        badge_icon: parsed.badge_icon || defaultBase.badge_icon || 'stethoscope',
        tax_number: parsed.tax_number !== undefined ? parsed.tax_number : defaultBase.tax_number,
        tax_rate: typeof parsed.tax_rate === 'number' ? parsed.tax_rate : defaultBase.tax_rate,
        tax_label: parsed.tax_label || defaultBase.tax_label || 'GST / Tax (5%)',
        timezone: parsed.timezone || defaultBase.timezone || 'Asia/Karachi',
        tooth_notation: effectiveNotation,
        currency_symbol: parsed.currency_symbol || defaultBase.currency_symbol || 'Rs. ',
        procedures: Array.isArray(parsed.procedures) && parsed.procedures.length > 0
          ? parsed.procedures
          : DEFAULT_PROCEDURES,
      };
    }

    return defaultBase;
  } catch (err) {
    console.error('Failed to read clinic settings:', err);
  }
  return DEFAULT_CLINIC_SETTINGS;
}

export function saveClinicSettings(settings: Partial<ClinicSettings>, explicitClinicId?: string | null): void {
  try {
    const activeId = explicitClinicId || localStorage.getItem('clinsyst_active_clinic_id');
    const key = getSettingsStorageKey(activeId);
    const existing = getClinicSettings(activeId);
    const merged: ClinicSettings = {
      ...existing,
      ...settings,
    };
    try {
      localStorage.setItem(key, JSON.stringify(merged));
      if (!activeId || activeId === 'clinic-dentivista-01') {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (storageErr) {
      console.warn('Storage set error, attempting compact storage merge:', storageErr);
      if (merged.logo_url && merged.logo_url.length > 250000) {
        const compact = { ...merged, logo_url: '' };
        try {
          localStorage.setItem(key, JSON.stringify(compact));
          if (!activeId || activeId === 'clinic-dentivista-01') {
            localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(compact));
          }
        } catch {}
      }
    }

    // Keep tenant records in clinsyst_tenants in sync
    try {
      const tenantsRaw = localStorage.getItem('clinsyst_tenants');
      if (tenantsRaw) {
        const tenants = JSON.parse(tenantsRaw);
        if (Array.isArray(tenants)) {
          const idx = activeId ? tenants.findIndex((t: any) => t.id === activeId) : 0;
          const tIdx = idx !== -1 ? idx : 0;
          if (tenants[tIdx]) {
            if (merged.clinic_name) tenants[tIdx].name = merged.clinic_name;
            if (merged.tagline !== undefined) tenants[tIdx].tagline = merged.tagline;
            if (merged.logo_url !== undefined) tenants[tIdx].logo_url = merged.logo_url;
            if (merged.address !== undefined) tenants[tIdx].address = merged.address;
            if (merged.phone !== undefined) tenants[tIdx].phone = merged.phone;
            if (merged.email !== undefined) tenants[tIdx].owner_email = merged.email;
            localStorage.setItem('clinsyst_tenants', JSON.stringify(tenants));
          }
        }
      }
    } catch (tErr) {
      console.warn('Tenant sync error in saveClinicSettings:', tErr);
    }

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
  } catch (err) {
    console.error('Failed to save clinic settings:', err);
  }
}

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettings>(getClinicSettings);

  useEffect(() => {
    function handleUpdate(e: Event) {
      if (e.type === 'clinsyst-tenant-changed') {
        // Tenant changed: reload full merged clinic settings for the active clinic
        setSettings(getClinicSettings());
        return;
      }
      const customEvent = e as CustomEvent<ClinicSettings>;
      if (e.type === EVENT_NAME && customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getClinicSettings());
      }
    }

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('clinsyst-tenant-changed', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('clinsyst-tenant-changed', handleUpdate);
    };
  }, []);

  function update(newSettings: ClinicSettings) {
    saveClinicSettings(newSettings);
    setSettings(newSettings);
  }

  return { settings, updateSettings: update, reload: () => setSettings(getClinicSettings()) };
}
