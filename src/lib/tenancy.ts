import { ClinicTenant, ClinicSignUpData, SubscriptionPlan, Staff, ClinicSettings } from './types';
import { saveClinicSettings, getClinicSettings } from './clinicSettings';
import { supabase } from './supabase';

const TENANTS_STORAGE_KEY = 'clinsyst_tenants';
const ACTIVE_CLINIC_STORAGE_KEY = 'clinsyst_active_clinic_id';
const TENANT_USERS_STORAGE_KEY = 'clinsyst_tenant_credentials';
export const CLINIC_TENANT_EVENT = 'clinsyst-tenant-changed';

export interface PlanSpec {
  name: string;
  max_seats: number;
  max_sessions: number;
  price: string;
  annual_price: string;
  badge?: string;
  highlight?: string;
  description: string;
}

export const PLAN_SPECS: Record<SubscriptionPlan, PlanSpec> = {
  starter: {
    name: 'Solo Practice (Starter)',
    max_seats: 2,
    max_sessions: 2,
    price: 'Rs. 1,799 / mo',
    annual_price: 'Rs. 1,499 / mo',
    badge: 'Save 25%',
    highlight: '25% cheaper than jDent',
    description: 'Perfect for solo dentists. Full EMR, dental charts, scheduling & billing.',
  },
  pro: {
    name: 'Clinic Pro (Growth)',
    max_seats: 5,
    max_sessions: 5,
    price: 'Rs. 3,499 / mo',
    annual_price: 'Rs. 2,899 / mo',
    badge: 'Popular',
    highlight: 'Best for 2-3 Chairs',
    description: 'Multi-doctor clinic management, stock expiry alerts, & revenue analytics.',
  },
  enterprise: {
    name: 'Hospital Enterprise',
    max_seats: 25,
    max_sessions: 25,
    price: 'Rs. 5,999 / mo',
    annual_price: 'Rs. 4,999 / mo',
    badge: 'Multi-Branch',
    highlight: 'Unlimited Scaling',
    description: 'Clinic chains, multi-branch switching, granular RBAC & priority support.',
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
  owner_email: '',
  phone: '',
  address: '',
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
 * Update clinic tenant branding and identity profile.
 * Synchronizes local tenancy store, Supabase remote clinics table, and dispatches clinic update events.
 */
export async function updateClinicTenantProfile(
  clinicId: string,
  profile: {
    name: string;
    tagline?: string | null;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    owner_email?: string | null;
    website?: string | null;
    tax_number?: string | null;
    badge_icon?: string | null;
  }
): Promise<ClinicTenant> {
  const all = getAllClinics();
  const idx = all.findIndex(c => c.id === clinicId);
  const current = idx !== -1 ? all[idx] : getActiveClinic();

  const updated: ClinicTenant = {
    ...current,
    name: profile.name.trim(),
    tagline: profile.tagline !== undefined && profile.tagline !== null ? profile.tagline.trim() : (profile.tagline === null ? '' : current.tagline),
    logo_url: profile.logo_url !== undefined && profile.logo_url !== null ? profile.logo_url : (profile.logo_url === null ? '' : current.logo_url),
    address: profile.address !== undefined && profile.address !== null ? profile.address.trim() : (profile.address === null ? '' : current.address),
    phone: profile.phone !== undefined && profile.phone !== null ? profile.phone.trim() : (profile.phone === null ? '' : current.phone),
    owner_email: profile.owner_email !== undefined && profile.owner_email !== null ? profile.owner_email.trim() : (profile.owner_email === null ? '' : current.owner_email),
  };

  if (idx !== -1) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  saveAllClinics(all);

  // Synchronize clinicSettings storage
  saveClinicSettings({
    clinic_name: updated.name,
    tagline: updated.tagline || '',
    logo_url: updated.logo_url || '',
    address: updated.address || '',
    phone: updated.phone || '',
    email: updated.owner_email || '',
    ...(profile.website !== undefined ? { website: profile.website || '' } : {}),
    ...(profile.tax_number !== undefined ? { tax_number: profile.tax_number || '' } : {}),
    ...(profile.badge_icon !== undefined ? { badge_icon: profile.badge_icon || 'stethoscope' } : {}),
  });

  // Sync with Supabase clinics table
  try {
    const dbUpdate: any = {
      name: updated.name,
      tagline: updated.tagline,
      address: updated.address,
      phone: updated.phone,
      owner_email: updated.owner_email,
    };
    if (updated.logo_url !== undefined) {
      dbUpdate.logo_url = updated.logo_url;
    }
    const { error } = await supabase
      .from('clinics')
      .update(dbUpdate)
      .eq('id', clinicId);

    if (error) {
      console.warn('Supabase clinic tenant profile update notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase clinic profile sync notice:', err);
  }

  // Ensure active clinic key points to this clinic
  localStorage.setItem(ACTIVE_CLINIC_STORAGE_KEY, updated.id);

  window.dispatchEvent(new CustomEvent(CLINIC_TENANT_EVENT, { detail: updated }));
  return updated;
}

/**
 * Switch active clinic tenant
 */
export function setActiveClinic(clinicId: string): ClinicTenant {
  const all = getAllClinics();
  const found = all.find(c => c.id === clinicId) || all[0];
  if (found) {
    localStorage.setItem(ACTIVE_CLINIC_STORAGE_KEY, found.id);
    const existing = getClinicSettings(found.id);

    // Synchronize clinic settings with this tenant's real identity from database
    const settings: ClinicSettings = {
      ...existing,
      clinic_name: found.name,
      tagline: found.tagline !== undefined && found.tagline !== null ? found.tagline : '',
      logo_url: found.logo_url || '',
      address: found.address || '',
      email: found.owner_email || '',
      phone: found.phone || '',
      website: existing.website || (found.slug ? `www.${found.slug}.com` : ''),
      tooth_notation: existing.tooth_notation || 'fdi',
      timezone: existing.timezone || 'Asia/Karachi',
      currency_symbol: existing.currency_symbol || 'Rs. ',
      tax_rate: typeof existing.tax_rate === 'number' ? existing.tax_rate : 5,
      tax_label: existing.tax_label || 'GST / Tax (5%)',
    };
    saveClinicSettings(settings, found.id);
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

const TENANT_STAFF_STORAGE_KEY = 'clinsyst_tenant_staff';

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
 * Retrieve all locally registered staff members across clinics
 */
export function getAllStoredStaff(): Staff[] {
  try {
    const raw = localStorage.getItem(TENANT_STAFF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save full list of tenant staff to local storage
 */
export function saveAllStoredStaff(staffList: Staff[]): void {
  try {
    localStorage.setItem(TENANT_STAFF_STORAGE_KEY, JSON.stringify(staffList));
  } catch (e) {
    console.error('Failed to save tenant staff list:', e);
  }
}

/**
 * Get staff members belonging to a specific clinic ID
 */
export function getTenantStaff(clinicId?: string): Staff[] {
  const all = getAllStoredStaff();
  if (!clinicId) return all;
  return all.filter(s => s.clinic_id === clinicId);
}

/**
 * Save or update a single staff member in local multi-tenant store
 */
export function saveTenantStaff(staff: Staff): void {
  const all = getAllStoredStaff();
  const idx = all.findIndex(
    s => s.id === staff.id || (s.email.toLowerCase() === staff.email.toLowerCase() && s.clinic_id === staff.clinic_id)
  );
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...staff };
  } else {
    all.push(staff);
  }
  saveAllStoredStaff(all);
}

/**
 * Register a staff member along with their login credentials
 */
export function saveTenantStaffMember(staff: Staff, password?: string): void {
  saveTenantStaff(staff);
  if (password) {
    const users = getStoredTenantUsers();
    const existingIdx = users.findIndex(u => u.email.toLowerCase() === staff.email.toLowerCase());
    const userEntry: TenantUserCredential = {
      email: staff.email.toLowerCase(),
      passwordHash: password,
      staffId: staff.id,
      clinicId: staff.clinic_id || 'clinic-dentivista-01',
      name: staff.name,
      role: staff.role,
    };
    if (existingIdx !== -1) {
      users[existingIdx] = userEntry;
    } else {
      users.push(userEntry);
    }
    saveStoredTenantUsers(users);
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
 * Register a brand-new multi-tenant clinic.
 * Automatically inserts a row into the clinics table with actual clinic data,
 * and creates an admin entry in the staff table for the signup email.
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
      tagline: data.tagline?.trim() || '',
      logo_url: '',
      status: 'trial',
      trial_ends_at: trialEnds,
      created_at: new Date().toISOString(),
    };

    // 1. Save clinic to multi-tenant store
    all.push(newClinic);
    saveAllClinics(all);

    // 2. Create the first Administrator staff member (Clinic Owner / Signup Admin)
    const staffId = `staff-${clinicId}-admin`;
    const newStaff: Staff = {
      id: staffId,
      user_id: `user-${clinicId}-admin`,
      clinic_id: clinicId,
      name: data.owner_name.trim(),
      role: 'admin',
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim() || null,
      specialization: data.tagline || 'Clinic Lead / Administrator',
      active: true,
      created_at: new Date().toISOString(),
    };

    // 3. Register user credentials and tenant staff member locally
    saveTenantStaffMember(newStaff, data.password);

    // 4. Supabase Remote Auth: sign up user with comprehensive clinic metadata
    let authUserId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            name: data.owner_name.trim(),
            owner_name: data.owner_name.trim(),
            clinic_id: clinicId,
            clinic_name: newClinic.name,
            role: 'admin',
            phone: data.phone.trim(),
            address: data.address.trim(),
            tagline: data.tagline?.trim() || '',
            plan: data.plan,
            billing_cycle: data.billing_cycle || 'annual',
          },
        },
      });

      if (authData?.user) {
        authUserId = authData.user.id;
        newStaff.user_id = authData.user.id;
        saveTenantStaffMember(newStaff, data.password);
      }
    } catch (e) {
      console.warn('Supabase remote auth signup notice (proceeding locally):', e);
    }

    // 5. Automatically insert actual clinic data row into Supabase clinics table
    try {
      const clinicRow = {
        id: clinicId,
        name: newClinic.name,
        slug: newClinic.slug,
        plan: newClinic.plan,
        max_seats: newClinic.max_seats,
        max_concurrent_sessions: newClinic.max_concurrent_sessions,
        owner_name: newClinic.owner_name,
        owner_email: newClinic.owner_email,
        phone: newClinic.phone || null,
        address: newClinic.address || null,
        tagline: newClinic.tagline || null,
        logo_url: null,
        status: 'trial',
        trial_ends_at: newClinic.trial_ends_at,
        created_at: newClinic.created_at,
      };

      const { error: clinicDbError } = await supabase
        .from('clinics')
        .upsert(clinicRow, { onConflict: 'id' });

      if (clinicDbError) {
        console.warn('Supabase clinics table insert notice:', clinicDbError.message);
      }
    } catch (e) {
      console.warn('Supabase clinics table notice:', e);
    }

    // 6. Automatically insert staff row for admin role (for signup email) into Supabase staff table
    try {
      const staffRow: any = {
        clinic_id: clinicId,
        name: newStaff.name,
        role: 'admin',
        email: newStaff.email,
        phone: newStaff.phone || null,
        specialization: newStaff.specialization || 'Clinic Lead / Administrator',
        active: true,
      };

      if (authUserId) {
        staffRow.user_id = authUserId;
      }

      const { data: dbStaff, error: staffDbError } = await supabase
        .from('staff')
        .insert(staffRow)
        .select()
        .maybeSingle();

      if (staffDbError) {
        console.warn('Supabase staff table insert notice:', staffDbError.message);
      } else if (dbStaff) {
        newStaff.id = dbStaff.id;
        if (dbStaff.user_id) newStaff.user_id = dbStaff.user_id;
        saveTenantStaffMember(newStaff, data.password);
      }
    } catch (e) {
      console.warn('Supabase staff table notice:', e);
    }

    // 7. Activate this new clinic tenant immediately
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

/**
 * Update a clinic's subscription plan tier and adjust seat & session quotas
 */
export function updateClinicPlan(clinicId: string, newPlan: SubscriptionPlan): boolean {
  try {
    const all = getAllClinics();
    const idx = all.findIndex(c => c.id === clinicId);
    if (idx === -1) return false;
    const spec = PLAN_SPECS[newPlan];
    all[idx] = {
      ...all[idx],
      plan: newPlan,
      max_seats: spec.max_seats,
      max_concurrent_sessions: spec.max_sessions,
      status: 'active', // Auto-activate membership on plan update
    };
    saveAllClinics(all);
    window.dispatchEvent(new CustomEvent(CLINIC_TENANT_EVENT, { detail: all[idx] }));
    return true;
  } catch (e) {
    console.error('Failed to update clinic plan:', e);
    return false;
  }
}

/**
 * Activate or deactivate membership access status for a clinic by clinicId
 * Updates local storage immediately and syncs with Supabase clinics table.
 */
export function updateClinicStatus(
  clinicId: string,
  status: 'active' | 'suspended' | 'trial'
): boolean {
  try {
    const all = getAllClinics();
    const idx = all.findIndex(c => c.id === clinicId);
    if (idx === -1) return false;
    all[idx] = {
      ...all[idx],
      status,
    };
    saveAllClinics(all);
    window.dispatchEvent(new CustomEvent(CLINIC_TENANT_EVENT, { detail: all[idx] }));

    // Async sync with Supabase clinics table
    Promise.resolve(
      supabase
        .from('clinics')
        .update({ status })
        .eq('id', clinicId)
    )
      .then(({ error }) => {
        if (error) {
          console.warn('Could not sync clinic status to Supabase:', error.message);
        }
      })
      .catch(() => {});

    return true;
  } catch (e) {
    console.error('Failed to update clinic status:', e);
    return false;
  }
}

/**
 * Convenience method to activate membership access for a clinic ID
 */
export function activateClinicMembership(clinicId: string): boolean {
  return updateClinicStatus(clinicId, 'active');
}

/**
 * Convenience method to deactivate/suspend membership access for a clinic ID
 */
export function deactivateClinicMembership(clinicId: string): boolean {
  return updateClinicStatus(clinicId, 'suspended');
}

/**
 * Sync clinic status and details from Supabase database table into local state
 */
export async function syncClinicFromDatabase(clinicId: string): Promise<ClinicTenant | null> {
  if (!clinicId) return null;
  try {
    let { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .maybeSingle();

    // Fallback: If not found by exact ID, attempt lookup by slug
    if (!data && !error) {
      const { data: bySlug } = await supabase
        .from('clinics')
        .select('*')
        .eq('slug', clinicId)
        .maybeSingle();
      if (bySlug) {
        data = bySlug;
      }
    }

    if (data && !error) {
      const all = getAllClinics();
      const idx = all.findIndex(c => c.id === data.id || c.id === clinicId);
      const existing = idx !== -1 ? all[idx] : null;

      // Authoritative database values from the 'clinics' table against user's clinic ID!
      // Do NOT overwrite with hardcoded defaults or wrong legacy cache.
      const effectiveName = (data.name && data.name.trim()) ? data.name.trim() : (existing?.name || '');
      const effectiveTagline = data.tagline !== undefined && data.tagline !== null ? data.tagline.trim() : (existing?.tagline || '');
      const effectivePhone = data.phone !== undefined && data.phone !== null ? data.phone.trim() : (existing?.phone || '');
      const effectiveAddress = data.address !== undefined && data.address !== null ? data.address.trim() : (existing?.address || '');
      const effectiveEmail = (data.owner_email && data.owner_email.trim()) ? data.owner_email.trim() : (existing?.owner_email || '');
      const effectiveLogo = data.logo_url !== undefined && data.logo_url !== null ? data.logo_url : (existing?.logo_url || '');

      const updated: ClinicTenant = {
        id: data.id,
        name: effectiveName,
        slug: data.slug || existing?.slug || 'clinic',
        plan: data.plan || existing?.plan || 'pro',
        max_seats: data.max_seats || existing?.max_seats || 5,
        max_concurrent_sessions: data.max_concurrent_sessions || existing?.max_concurrent_sessions || 5,
        owner_name: data.owner_name || existing?.owner_name || '',
        owner_email: effectiveEmail,
        phone: effectivePhone,
        address: effectiveAddress,
        tagline: effectiveTagline,
        logo_url: effectiveLogo,
        status: data.status || existing?.status || 'active',
        trial_ends_at: data.trial_ends_at || existing?.trial_ends_at || new Date(Date.now() + 14 * 86400000).toISOString(),
        created_at: data.created_at || existing?.created_at || new Date().toISOString(),
      };

      if (idx !== -1) {
        all[idx] = updated;
      } else {
        all.push(updated);
      }
      saveAllClinics(all);

      // Keep active clinic storage key pointing to this clinic
      localStorage.setItem(ACTIVE_CLINIC_STORAGE_KEY, data.id);

      // Synchronize clinicSettings storage for this clinic ID so useClinicSettings() and getClinicSettings() reflect database data
      const existingSettings = getClinicSettings(data.id);
      saveClinicSettings({
        ...existingSettings,
        clinic_name: updated.name,
        tagline: updated.tagline || '',
        logo_url: updated.logo_url || '',
        address: updated.address || '',
        phone: updated.phone || '',
        email: updated.owner_email || '',
        website: existingSettings.website || (updated.slug ? `www.${updated.slug}.com` : ''),
      }, data.id);

      window.dispatchEvent(new CustomEvent(CLINIC_TENANT_EVENT, { detail: updated }));
      return updated;
    }
  } catch (err) {
    console.warn('Could not sync clinic from database:', err);
  }
  return null;
}

