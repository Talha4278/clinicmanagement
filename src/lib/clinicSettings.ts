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
  clinic_name: 'Dentivista Dental & Aesthetics',
  tagline: 'Dental & Aesthetics Healthcare',
  logo_url: '',
  address: '1st Floor, 6/Street 2, Down Town Royal Orchard, Multan',
  email: 'sarah@dentivista.com',
  phone: '(+92) 300-0979185',
  website: 'www.dentivista.com',
  tax_number: 'NTN-8921-D',
  tax_rate: 5,
  tax_label: 'GST / Tax (5%)',
  timezone: 'Asia/Karachi',
  tooth_notation: 'fdi',
  currency_symbol: 'Rs. ',
  whatsapp_config: {
    enabled: true,
    provider: 'cloud_api',
    business_number: '(+92) 300-0979185',
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
  },
  procedures: DEFAULT_PROCEDURES,
};

const LEGACY_STORAGE_KEY = 'dentivista_clinic_settings';
const EVENT_NAME = 'clinic-settings-updated';

function getSettingsStorageKey(): string {
  try {
    const rawActiveId = localStorage.getItem('clinsyst_active_clinic_id');
    if (rawActiveId) {
      return `dentivista_clinic_${rawActiveId}_settings`;
    }
  } catch {}
  return LEGACY_STORAGE_KEY;
}

export function getClinicSettings(): ClinicSettings {
  try {
    let defaultBase = DEFAULT_CLINIC_SETTINGS;
    try {
      const activeTenantRaw = localStorage.getItem('clinsyst_tenants');
      const activeId = localStorage.getItem('clinsyst_active_clinic_id');
      if (activeTenantRaw) {
        const tenants = JSON.parse(activeTenantRaw);
        const currentTenant = Array.isArray(tenants)
          ? tenants.find((t: any) => t.id === activeId) || tenants[0]
          : null;

        if (currentTenant) {
          defaultBase = {
            ...DEFAULT_CLINIC_SETTINGS,
            clinic_name: currentTenant.name || DEFAULT_CLINIC_SETTINGS.clinic_name,
            tagline: currentTenant.tagline || DEFAULT_CLINIC_SETTINGS.tagline,
            logo_url: currentTenant.logo_url || '',
            address: currentTenant.address || DEFAULT_CLINIC_SETTINGS.address,
            email: currentTenant.owner_email || DEFAULT_CLINIC_SETTINGS.email,
            phone: currentTenant.phone || DEFAULT_CLINIC_SETTINGS.phone,
            website: currentTenant.slug ? `www.${currentTenant.slug}.com` : DEFAULT_CLINIC_SETTINGS.website,
          };
        }
      }
    } catch {}

    const key = getSettingsStorageKey();
    let raw = localStorage.getItem(key);

    // Fall back to legacy key if clinic-scoped key is empty
    if (!raw && key !== LEGACY_STORAGE_KEY) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && legacyParsed.clinic_name && !legacyParsed.clinic_name.includes('Apex Dental')) {
          raw = legacyRaw;
        }
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if ('doctors' in parsed) {
        delete parsed.doctors;
      }
      // Purge legacy Apex Dental overrides if present in cached settings
      if (parsed.clinic_name && parsed.clinic_name.includes('Apex Dental Care')) {
        delete parsed.clinic_name;
        delete parsed.email;
        delete parsed.address;
        delete parsed.website;
      }
      return {
        ...defaultBase,
        ...parsed,
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

export function saveClinicSettings(settings: ClinicSettings): void {
  try {
    const key = getSettingsStorageKey();
    localStorage.setItem(key, JSON.stringify(settings));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
  } catch (err) {
    console.error('Failed to save clinic settings:', err);
  }
}

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettings>(getClinicSettings);

  useEffect(() => {
    function handleUpdate(e: Event) {
      const customEvent = e as CustomEvent<ClinicSettings>;
      if (customEvent.detail) {
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
