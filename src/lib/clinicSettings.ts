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
  clinic_name: 'Dentivista',
  tagline: 'Dental & Aesthetics',
  logo_url: '',
  address: '1st Floor, 6/Street 2, Down Town Royal Orchard, Multan',
  email: 'info@dentivista.com',
  phone: '(+92) 300-0979185',
  website: 'www.dentivista.com',
  tax_number: 'NTN-8921-D',
  currency_symbol: 'Rs.',
  whatsapp_config: {
    enabled: true,
    provider: 'direct_web',
    business_number: '+92 300 0979185',
    api_endpoint: 'https://graph.facebook.com/v19.0',
    api_key: '',
    phone_number_id: '',
    account_sid: '',
    webhook_url: 'https://api.yourclinic.com/webhooks/whatsapp',
    auto_remind_hours_before: 24,
  },
  procedures: DEFAULT_PROCEDURES,
};

const STORAGE_KEY = 'dentivista_clinic_settings';
const EVENT_NAME = 'clinic-settings-updated';

export function getClinicSettings(): ClinicSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up legacy hardcoded doctors if present
      if ('doctors' in parsed) {
        delete parsed.doctors;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return {
        ...DEFAULT_CLINIC_SETTINGS,
        ...parsed,
        procedures: Array.isArray(parsed.procedures) && parsed.procedures.length > 0
          ? parsed.procedures
          : DEFAULT_PROCEDURES,
      };
    }
  } catch (err) {
    console.error('Failed to read clinic settings:', err);
  }
  return DEFAULT_CLINIC_SETTINGS;
}

export function saveClinicSettings(settings: ClinicSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  function update(newSettings: ClinicSettings) {
    saveClinicSettings(newSettings);
    setSettings(newSettings);
  }

  return { settings, updateSettings: update, reload: () => setSettings(getClinicSettings()) };
}
