import { CurrencyCode } from './internationalPricing';

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
 * 1. URL parameter (?currency=PKR or ?currency=USD)
 * 2. User's manual selection in localStorage (PKR or USD)
 * 3. Fast non-blocking IP Geolocation API (ipapi.co -> api.country.is)
 *    - Pakistan (PK) -> PKR
 *    - All other countries -> USD
 * 4. Timezone heuristic fallback (Karachi -> PKR, all others -> USD)
 * 5. Default fallback (USD)
 */
export async function detectVisitorCurrency(): Promise<GeoDetectionResult> {
  // 1. Check URL parameters
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryCurr = params.get('currency')?.toUpperCase();
      if (queryCurr === 'PKR' || queryCurr === 'USD') {
        const queryCountry = params.get('country')?.toUpperCase() || (queryCurr === 'PKR' ? 'PK' : 'US');
        return {
          currency: queryCurr as CurrencyCode,
          countryCode: queryCountry,
          countryName: queryCurr === 'PKR' ? 'Pakistan' : (COUNTRY_NAMES[queryCountry] || 'International'),
          source: 'url',
        };
      }
    } catch {}
  }

  // 2. Check localStorage for manual user selection (PKR or USD only)
  if (typeof window !== 'undefined') {
    try {
      const manualCurr = localStorage.getItem(STORAGE_KEY_MANUAL) || localStorage.getItem('clinsyst_manual_currency');
      if (manualCurr === 'PKR' || manualCurr === 'USD') {
        const country = localStorage.getItem(STORAGE_KEY_COUNTRY) || localStorage.getItem('clinsyst_detected_country') || '';
        const isPak = manualCurr === 'PKR';
        return {
          currency: manualCurr as CurrencyCode,
          countryCode: isPak ? 'PK' : (country && country !== 'Pakistan' ? 'US' : 'US'),
          countryName: country || (isPak ? 'Pakistan' : 'International'),
          source: 'manual',
        };
      }
    } catch {}
  }

  // 3. Check cached IP detection (PKR or USD only)
  if (typeof window !== 'undefined') {
    try {
      const cachedCurr = localStorage.getItem(STORAGE_KEY_CURRENCY) || localStorage.getItem('clinsyst_detected_currency');
      const cachedCountry = localStorage.getItem(STORAGE_KEY_COUNTRY) || localStorage.getItem('clinsyst_detected_country') || '';
      if (cachedCurr === 'PKR' || cachedCurr === 'USD') {
        const isPak = cachedCurr === 'PKR';
        return {
          currency: cachedCurr as CurrencyCode,
          countryCode: isPak ? 'PK' : 'US',
          countryName: cachedCountry || (isPak ? 'Pakistan' : 'International'),
          source: 'cache',
        };
      }
    } catch {}
  }

  // 4. Primary Fast IP Geolocation: api.country.is (Reliable, fast, no Cloudflare blocks)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://api.country.is', { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const code = (data.country || '').toUpperCase();
      if (code) {
        const isPakistan = code === 'PK';
        const mappedCurr: CurrencyCode = isPakistan ? 'PKR' : 'USD';
        const countryName = isPakistan ? 'Pakistan' : (COUNTRY_NAMES[code] || code || 'International');

        try {
          localStorage.setItem(STORAGE_KEY_CURRENCY, mappedCurr);
          localStorage.setItem(STORAGE_KEY_COUNTRY, countryName);
          localStorage.setItem('clinsyst_detected_currency', mappedCurr);
          localStorage.setItem('clinsyst_detected_country', countryName);
        } catch {}

        return {
          currency: mappedCurr,
          countryCode: isPakistan ? 'PK' : code,
          countryName,
          source: 'ip',
        };
      }
    }
  } catch {}

  // 5. Secondary IP Geolocation: ipwho.is
  try {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 1800);
    const res2 = await fetch('https://ipwho.is/', { signal: controller2.signal });
    clearTimeout(timer2);

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.success !== false && data2.country_code) {
        const code2 = (data2.country_code || '').toUpperCase();
        const isPakistan = code2 === 'PK';
        const mappedCurr2: CurrencyCode = isPakistan ? 'PKR' : 'USD';
        const countryName2 = isPakistan ? 'Pakistan' : (data2.country || 'International');

        try {
          localStorage.setItem(STORAGE_KEY_CURRENCY, mappedCurr2);
          localStorage.setItem(STORAGE_KEY_COUNTRY, countryName2);
          localStorage.setItem('clinsyst_detected_currency', mappedCurr2);
          localStorage.setItem('clinsyst_detected_country', countryName2);
        } catch {}

        return {
          currency: mappedCurr2,
          countryCode: isPakistan ? 'PK' : code2,
          countryName: countryName2,
          source: 'ip',
        };
      }
    }
  } catch {}

  // 6. Timezone heuristic fallback (reliable offline & adblocker resistant)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Karachi') || tz.toLowerCase().includes('pakistan')) {
      return { currency: 'PKR', countryCode: 'PK', countryName: 'Pakistan', source: 'timezone' };
    }
  } catch {}

  // 7. Default fallback (USD for international clinics)
  return {
    currency: 'USD',
    countryCode: 'US',
    countryName: 'International',
    source: 'default',
  };
}

/**
 * Persists user's manual currency choice (normalized to PKR or USD)
 */
export function saveManualCurrency(currency: CurrencyCode) {
  try {
    const validCurr = currency === 'PKR' ? 'PKR' : 'USD';
    localStorage.setItem(STORAGE_KEY_MANUAL, validCurr);
    localStorage.setItem(STORAGE_KEY_CURRENCY, validCurr);
  } catch {}
}
