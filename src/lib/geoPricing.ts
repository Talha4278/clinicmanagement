import { CurrencyCode, SUPPORTED_CURRENCIES } from './internationalPricing';

export interface GeoDetectionResult {
  currency: CurrencyCode;
  countryCode: string;
  countryName: string;
  source: 'url' | 'manual' | 'cache' | 'ip' | 'timezone' | 'default';
}

export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  PK: 'PKR',
  AE: 'AED',
  SA: 'SAR',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'AUD',
  // Eurozone
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
};

export const COUNTRY_NAMES: Record<string, string> = {
  PK: 'Pakistan',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
};

const STORAGE_KEY_CURRENCY = 'clinsyst_currency';
const STORAGE_KEY_COUNTRY = 'clinsyst_country';
const STORAGE_KEY_MANUAL = 'clinsyst_manual_currency';

/**
 * Detects visitor's region and currency using a multi-tiered approach:
 * 1. URL parameter (?currency=PKR or ?country=PK)
 * 2. User's manual selection in localStorage
 * 3. Fast non-blocking IP Geolocation API (ipapi.co -> api.country.is)
 * 4. Timezone heuristic fallback (works offline or when privacy extensions block IP APIs)
 * 5. Default fallback (USD)
 */
export async function detectVisitorCurrency(): Promise<GeoDetectionResult> {
  // 1. Check URL parameters
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryCurr = params.get('currency')?.toUpperCase() as CurrencyCode | null;
      if (queryCurr && SUPPORTED_CURRENCIES[queryCurr]) {
        const queryCountry = params.get('country')?.toUpperCase() || '';
        return {
          currency: queryCurr,
          countryCode: queryCountry,
          countryName: COUNTRY_NAMES[queryCountry] || queryCountry || 'Selected Region',
          source: 'url',
        };
      }
    } catch {}
  }

  // 2. Check localStorage for manual user selection
  if (typeof window !== 'undefined') {
    try {
      const manualCurr = localStorage.getItem(STORAGE_KEY_MANUAL) as CurrencyCode | null;
      if (manualCurr && SUPPORTED_CURRENCIES[manualCurr]) {
        const country = localStorage.getItem(STORAGE_KEY_COUNTRY) || '';
        return {
          currency: manualCurr,
          countryCode: '',
          countryName: country || 'Custom Selection',
          source: 'manual',
        };
      }
    } catch {}
  }

  // 3. Check cached IP detection
  if (typeof window !== 'undefined') {
    try {
      const cachedCurr = localStorage.getItem(STORAGE_KEY_CURRENCY) as CurrencyCode | null;
      const cachedCountry = localStorage.getItem(STORAGE_KEY_COUNTRY) || '';
      if (cachedCurr && SUPPORTED_CURRENCIES[cachedCurr]) {
        return {
          currency: cachedCurr,
          countryCode: '',
          countryName: cachedCountry,
          source: 'cache',
        };
      }
    } catch {}
  }

  // 4. Fast Async IP Geolocation with 2.5s timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const code = (data.country_code || data.country || '').toUpperCase();
      const name = data.country_name || COUNTRY_NAMES[code] || code;
      const mappedCurr = COUNTRY_TO_CURRENCY[code] || (SUPPORTED_CURRENCIES[data.currency as CurrencyCode] ? data.currency : 'USD');

      if (SUPPORTED_CURRENCIES[mappedCurr]) {
        try {
          localStorage.setItem(STORAGE_KEY_CURRENCY, mappedCurr);
          localStorage.setItem(STORAGE_KEY_COUNTRY, name);
        } catch {}
        return {
          currency: mappedCurr,
          countryCode: code,
          countryName: name,
          source: 'ip',
        };
      }
    }
  } catch {
    // Secondary fallback to api.country.is
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 1500);
      const res2 = await fetch('https://api.country.is', { signal: controller2.signal });
      clearTimeout(timer2);

      if (res2.ok) {
        const data2 = await res2.json();
        const code2 = (data2.country || '').toUpperCase();
        const name2 = COUNTRY_NAMES[code2] || code2;
        const mappedCurr2 = COUNTRY_TO_CURRENCY[code2] || 'USD';

        if (SUPPORTED_CURRENCIES[mappedCurr2]) {
          try {
            localStorage.setItem(STORAGE_KEY_CURRENCY, mappedCurr2);
            localStorage.setItem(STORAGE_KEY_COUNTRY, name2);
          } catch {}
          return {
            currency: mappedCurr2,
            countryCode: code2,
            countryName: name2,
            source: 'ip',
          };
        }
      }
    } catch {}
  }

  // 5. Timezone heuristic fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Karachi')) {
      return { currency: 'PKR', countryCode: 'PK', countryName: 'Pakistan', source: 'timezone' };
    }
    if (tz.includes('Dubai') || tz.includes('Muscat')) {
      return { currency: 'AED', countryCode: 'AE', countryName: 'UAE', source: 'timezone' };
    }
    if (tz.includes('Riyadh')) {
      return { currency: 'SAR', countryCode: 'SA', countryName: 'Saudi Arabia', source: 'timezone' };
    }
    if (tz.includes('London')) {
      return { currency: 'GBP', countryCode: 'GB', countryName: 'United Kingdom', source: 'timezone' };
    }
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) {
      return { currency: 'CAD', countryCode: 'CA', countryName: 'Canada', source: 'timezone' };
    }
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane')) {
      return { currency: 'AUD', countryCode: 'AU', countryName: 'Australia', source: 'timezone' };
    }
    if (tz.includes('Berlin') || tz.includes('Paris') || tz.includes('Madrid') || tz.includes('Rome') || tz.includes('Amsterdam')) {
      return { currency: 'EUR', countryCode: 'EU', countryName: 'Europe', source: 'timezone' };
    }
  } catch {}

  // 6. Default
  return {
    currency: 'USD',
    countryCode: 'US',
    countryName: 'International',
    source: 'default',
  };
}

/**
 * Persists user's manual currency choice
 */
export function saveManualCurrency(currency: CurrencyCode) {
  try {
    localStorage.setItem(STORAGE_KEY_MANUAL, currency);
    localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
  } catch {}
}
