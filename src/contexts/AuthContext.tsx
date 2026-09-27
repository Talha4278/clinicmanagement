import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Staff, ClinicTenant, ClinicSignUpData } from '../lib/types';
import {
  getActiveClinic,
  setActiveClinic,
  registerNewClinic,
  findTenantUser,
  CLINIC_TENANT_EVENT,
} from '../lib/tenancy';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  activeClinic: ClinicTenant;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  registerClinic: (data: ClinicSignUpData) => Promise<{ error: string | null }>;
  switchClinicTenant: (clinicId: string) => void;
  signInAsDemo: (role?: 'admin' | 'doctor' | 'receptionist') => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_STAFF_MAP: Record<string, Staff> = {
  doctor: {
    id: 'staff-demo-doc',
    user_id: 'user-demo-doc',
    clinic_id: 'clinic-dentivista-01',
    name: 'Dr. Sarah Tariq',
    role: 'doctor',
    email: 'sarah@dentivista.com',
    phone: '+92 300 5551234',
    specialization: 'Dental Surgeon & Implantologist',
    active: true,
    created_at: new Date().toISOString(),
  },
  admin: {
    id: 'staff-demo-admin',
    user_id: 'user-demo-admin',
    clinic_id: 'clinic-dentivista-01',
    name: 'Clinic Administrator',
    role: 'admin',
    email: 'admin@dentivista.com',
    phone: '+92 300 1112233',
    specialization: 'Operations & Management',
    active: true,
    created_at: new Date().toISOString(),
  },
  receptionist: {
    id: 'staff-demo-rec',
    user_id: 'user-demo-rec',
    clinic_id: 'clinic-dentivista-01',
    name: 'Ayesha Khan',
    role: 'receptionist',
    email: 'reception@dentivista.com',
    phone: '+92 300 4445566',
    specialization: 'Front Desk & Patient Care',
    active: true,
    created_at: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [activeClinic, setActiveClinicState] = useState<ClinicTenant>(getActiveClinic);
  const [loading, setLoading] = useState(true);

  async function fetchStaff(userId: string) {
    try {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setStaff(data);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // Listen to clinic tenant change events
    function handleTenantChange(e: Event) {
      const ce = e as CustomEvent<ClinicTenant>;
      if (ce.detail) {
        setActiveClinicState(ce.detail);
      } else {
        setActiveClinicState(getActiveClinic());
      }
    }

    window.addEventListener(CLINIC_TENANT_EVENT, handleTenantChange);

    // Check if demo session is stored
    const demoRole = localStorage.getItem('dentivista_demo_role');
    if (demoRole && DEMO_STAFF_MAP[demoRole]) {
      const demoStaff = DEMO_STAFF_MAP[demoRole];
      setStaff(demoStaff);
      setUser({
        id: demoStaff.user_id!,
        email: demoStaff.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setLoading(false);
      return () => window.removeEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
    }

    // Check if tenant user session is stored
    const savedTenantUserJson = localStorage.getItem('clinsyst_active_staff_session');
    if (savedTenantUserJson) {
      try {
        const saved = JSON.parse(savedTenantUserJson);
        if (saved?.staff && saved?.user) {
          setStaff(saved.staff);
          setUser(saved.user);
          setActiveClinicState(getActiveClinic());
          setLoading(false);
          return () => window.removeEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
        }
      } catch (err) {
        console.warn('Failed to parse saved tenant session:', err);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchStaff(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchStaff(session.user.id);
      } else if (!localStorage.getItem('dentivista_demo_role') && !localStorage.getItem('clinsyst_active_staff_session')) {
        setStaff(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
    };
  }, []);

  async function registerClinic(data: ClinicSignUpData): Promise<{ error: string | null }> {
    setLoading(true);
    const result = await registerNewClinic(data);
    if (result.error) {
      setLoading(false);
      return { error: result.error };
    }

    // Immediately log in as the newly created clinic owner
    const newUser: User = {
      id: result.staff.user_id || `user-${result.staff.id}`,
      email: result.staff.email,
      app_metadata: { clinic_id: result.clinic.id, role: 'admin' },
      user_metadata: { name: result.staff.name, clinic_name: result.clinic.name },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;

    localStorage.removeItem('dentivista_demo_role');
    localStorage.setItem(
      'clinsyst_active_staff_session',
      JSON.stringify({ staff: result.staff, user: newUser })
    );

    setUser(newUser);
    setStaff(result.staff);
    setActiveClinicState(result.clinic);
    setLoading(false);

    return { error: null };
  }

  function switchClinicTenant(clinicId: string) {
    const updated = setActiveClinic(clinicId);
    setActiveClinicState(updated);
  }

  async function signIn(email: string, password: string) {
    // 1. Check if user is in multi-tenant registry
    const tenantUser = findTenantUser(email);
    if (tenantUser) {
      if (tenantUser.passwordHash && tenantUser.passwordHash !== password) {
        return { error: 'Invalid password. Please check your credentials.' };
      }

      // Switch active clinic
      const clinic = setActiveClinic(tenantUser.clinicId);
      setActiveClinicState(clinic);

      const staffObj: Staff = {
        id: tenantUser.staffId,
        user_id: `user-${tenantUser.staffId}`,
        clinic_id: tenantUser.clinicId,
        name: tenantUser.name,
        role: tenantUser.role,
        email: tenantUser.email,
        phone: '',
        specialization: 'Clinic Member',
        active: true,
        created_at: new Date().toISOString(),
      };

      const userObj: User = {
        id: staffObj.user_id!,
        email: staffObj.email,
        app_metadata: { clinic_id: tenantUser.clinicId, role: tenantUser.role },
        user_metadata: { name: staffObj.name, clinic_name: clinic.name },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;

      localStorage.removeItem('dentivista_demo_role');
      localStorage.setItem(
        'clinsyst_active_staff_session',
        JSON.stringify({ staff: staffObj, user: userObj })
      );

      setStaff(staffObj);
      setUser(userObj);
      return { error: null };
    }

    // 2. Otherwise authenticate against Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    localStorage.removeItem('dentivista_demo_role');
    localStorage.removeItem('clinsyst_active_staff_session');
    return { error: null };
  }

  function signInAsDemo(role: 'admin' | 'doctor' | 'receptionist' = 'doctor') {
    const demoStaff = DEMO_STAFF_MAP[role] || DEMO_STAFF_MAP.doctor;
    localStorage.setItem('dentivista_demo_role', role);
    localStorage.removeItem('clinsyst_active_staff_session');
    setStaff(demoStaff);
    setUser({
      id: demoStaff.user_id!,
      email: demoStaff.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);
    setLoading(false);
  }

  async function signOut() {
    localStorage.removeItem('dentivista_demo_role');
    localStorage.removeItem('clinsyst_active_staff_session');
    setUser(null);
    setStaff(null);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff,
        activeClinic,
        loading,
        signIn,
        registerClinic,
        switchClinicTenant,
        signInAsDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
