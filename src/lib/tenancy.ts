import { ClinicTenant, ClinicSignUpData, SubscriptionPlan, Staff, ClinicSettings } from './types';
import { saveClinicSettings } from './clinicSettings';
import { supabase } from './supabase';

const TENANTS_STORAGE_KEY = 'clinsyst_tenants';
const ACTIVE_CLINIC_STORAGE_KEY = 'clinsyst_active_clinic_id';
const TENANT_USERS_STORAGE_KEY = 'clinsyst_tenant_credentials';
export const CLINIC_TENANT_EVENT = 'clinsyst-tenant-changed';

export const PLAN_SPECS: Record<SubscriptionPlan, { name: string; max_seats: number; max_sessions: number; price: string }> = {
  starter: {
    name: 'Solo Practice (Starter)',
    max_seats: 2,
    max_sessions: 2,
    price: 'Rs. 4,500 / mo',
  },
  pro: {
    name: 'Clinic Pro (Growth)',
    max_seats: 5,
    max_sessions: 5,
    price: 'Rs. 9,500 / mo',
  },
  enterprise: {
    name: 'Hospital Enterprise',
    max_seats: 25,
    max_sessions: 25,
    price: 'Rs. 22,000 / mo',
  },
};

// Default seed clinic
export const DEFAULT_CLINIC_TENANT: ClinicTenant = {
  id: 'clinic-dentivista-01',
  name: 'Dentivista',
  slug: 'dentivista',
  plan: 'pro',
  max_seats: 5,
  max_concurrent_sessions: 5,
  owner_name: 'Dr. Sarah Tariq',
  owner_email: 'sarah@dentivista.com',
  phone: '(+92) 300-0979185',
  address: '1st Floor, 6/Street 2, Down Town Royal Orchard, Multan',
  tagline: 'Dental & Aesthetics',
  logo_url: '',
  status: 'active',
  trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
};

/**
 * Retrieve all registered clinics from storage
 */
export function getAllClinics(): ClinicTenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as ClinicTenant[];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.error('Failed to parse tenants:', err);
  }
  // Initialize with default
  const initial = [DEFAULT_CLINIC_TENANT];
  saveAllClinics(initial);
  return initial;
}

export function saveAllClinics(clinics: ClinicTenant[]): void {
  try {
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(clinics));
  } catch (err) {
    console.error('Failed to save tenants:', err);
  }
}

/**
 * Get active clinic tenant
 */
export function getActiveClinic(): ClinicTenant {
  const all = getAllClinics();
  const activeId = localStorage.getItem(ACTIVE_CLINIC_STORAGE_KEY);
  if (activeId) {
    const found = all.find(c => c.id === activeId);
    if (found) return found;
  }
  return all[0] || DEFAULT_CLINIC_TENANT;
}

/**
 * Switch active clinic tenant
 */
export function setActiveClinic(clinicId: string): ClinicTenant {
  const all = getAllClinics();
  const found = all.find(c => c.id === clinicId) || all[0];
  if (found) {
    localStorage.setItem(ACTIVE_CLINIC_STORAGE_KEY, found.id);
    // Sync clinicSettings as well
    const settings: ClinicSettings = {
      clinic_name: found.name,
      tagline: found.tagline || 'Dental & Aesthetic Care',
      logo_url: found.logo_url || '',
      address: found.address,
      email: found.owner_email,
      phone: found.phone,
      website: `www.${found.slug}.com`,
      tax_number: 'NTN-8921-D',
      currency_symbol: 'Rs.',
    };
    saveClinicSettings(settings);
    window.dispatchEvent(new CustomEvent(CLINIC_TENANT_EVENT, { detail: found }));
  }
  return found;
}

export interface TenantUserCredential {
  email: string;
  passwordHash: string; // Plain/masked representation in demo mode
  staffId: string;
  clinicId: string;
  name: string;
  role: 'admin' | 'doctor' | 'receptionist';
}

function getStoredTenantUsers(): TenantUserCredential[] {
  try {
    const raw = localStorage.getItem(TENANT_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredTenantUsers(users: TenantUserCredential[]): void {
  try {
    localStorage.setItem(TENANT_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save tenant users:', e);
  }
}

/**
 * Find tenant user credentials by email
 */
export function findTenantUser(email: string): TenantUserCredential | null {
  const users = getStoredTenantUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Register a brand-new multi-tenant clinic
 */
export async function registerNewClinic(data: ClinicSignUpData): Promise<{
  clinic: ClinicTenant;
  staff: Staff;
  error: string | null;
}> {
  try {
    const all = getAllClinics();

    // Check if email already registered in existing clinics
    const existing = all.find(c => c.owner_email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return {
        clinic: existing,
        staff: {} as Staff,
        error: `A clinic account with email ${data.email} already exists. Please sign in or use another email.`,
      };
    }

    const planSpec = PLAN_SPECS[data.plan] || PLAN_SPECS.starter;
    const clinicId = `clinic-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const slug = data.clinic_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const trialDays = 14;
    const trialEnds = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const newClinic: ClinicTenant = {
      id: clinicId,
      name: data.clinic_name.trim(),
      slug: slug || 'my-clinic',
      plan: data.plan,
      max_seats: planSpec.max_seats,
      max_concurrent_sessions: planSpec.max_sessions,
      owner_name: data.owner_name.trim(),
      owner_email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      tagline: data.tagline?.trim() || 'Dental & Aesthetics Healthcare',
      logo_url: '',
      status: 'trial',
      trial_ends_at: trialEnds,
      created_at: new Date().toISOString(),
    };

    // 1. Save clinic to tenants list
    all.push(newClinic);
    saveAllClinics(all);

    // 2. Create the first Administrator staff member (Clinic Owner / Lead Doctor)
    const staffId = `staff-${clinicId}-admin`;
    const newStaff: Staff = {
      id: staffId,
      user_id: `user-${clinicId}-admin`,
      clinic_id: clinicId,
      name: data.owner_name.trim(),
      role: 'admin',
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      specialization: data.tagline || 'Clinic Lead / Administrator',
      active: true,
      created_at: new Date().toISOString(),
    };

    // 3. Register user credentials
    const users = getStoredTenantUsers();
    users.push({
      email: data.email.trim().toLowerCase(),
      passwordHash: data.password,
      staffId: newStaff.id,
      clinicId: newClinic.id,
      name: newStaff.name,
      role: 'admin',
    });
    saveStoredTenantUsers(users);

    // 4. Try Supabase Auth Sign Up in background (if configured)
    try {
      await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            name: data.owner_name,
            clinic_id: clinicId,
            clinic_name: newClinic.name,
            role: 'admin',
          },
        },
      });
    } catch (e) {
      console.warn('Supabase remote auth signup notice (proceeding locally):', e);
    }

    // 5. Activate this new clinic tenant immediately
    setActiveClinic(newClinic.id);

    return {
      clinic: newClinic,
      staff: newStaff,
      error: null,
    };
  } catch (err: any) {
    console.error('Registration failed:', err);
    return {
      clinic: {} as ClinicTenant,
      staff: {} as Staff,
      error: err?.message || 'Failed to complete clinic registration. Please try again.',
    };
  }
}

/**
 * Check if the active clinic can add more staff accounts based on subscription seat limit
 */
export function checkSeatLimit(currentStaffCount: number, clinicId?: string): {
  allowed: boolean;
  currentCount: number;
  maxSeats: number;
  remainingSeats: number;
  plan: SubscriptionPlan;
  clinicName: string;
} {
  const clinic = clinicId
    ? getAllClinics().find(c => c.id === clinicId) || getActiveClinic()
    : getActiveClinic();

  const maxSeats = clinic.max_seats || 2;
  const allowed = currentStaffCount < maxSeats;
  const remainingSeats = Math.max(0, maxSeats - currentStaffCount);

  return {
    allowed,
    currentCount: currentStaffCount,
    maxSeats,
    remainingSeats,
    plan: clinic.plan,
    clinicName: clinic.name,
  };
}
