import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Staff, ClinicTenant, ClinicSignUpData, ActiveSession } from '../lib/types';
import {
  getActiveClinic,
  setActiveClinic,
  registerNewClinic,
  findTenantUser,
  CLINIC_TENANT_EVENT,
} from '../lib/tenancy';
import {
  registerSession,
  heartbeatSession,
  terminateSession,
  terminateOtherSessions,
  endCurrentSession,
  getActiveSessions,
  listenForSessionTermination,
  SESSION_UPDATED_EVENT,
} from '../lib/sessionManager';
import { seedDemoData } from '../lib/demoData';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  activeClinic: ClinicTenant;
  activeSessions: ActiveSession[];
  terminatedNotice: string | null;
  loading: boolean;
  clearTerminatedNotice: () => void;
  terminateSessionById: (sessionId: string) => void;
  terminateAllOtherSessions: () => void;
  signIn: (
    email: string,
    password: string,
    forceTerminateOldest?: boolean
  ) => Promise<{
    error: string | null;
    sessionExceeded?: boolean;
    activeCount?: number;
    maxSessions?: number;
  }>;
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
  const [activeSessions, setActiveSessionsState] = useState<ActiveSession[]>([]);
  const [terminatedNotice, setTerminatedNotice] = useState<string | null>(null);
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

  function refreshSessions() {
    const list = getActiveSessions(activeClinic?.id);
    setActiveSessionsState(list);
  }

  useEffect(() => {
    // 1. Listen to clinic tenant change events
    function handleTenantChange(e: Event) {
      const ce = e as CustomEvent<ClinicTenant>;
      const newClinic = ce.detail || getActiveClinic();
      setActiveClinicState(newClinic);
      setActiveSessionsState(getActiveSessions(newClinic.id));
    }

    // 2. Listen to session updates
    function handleSessionsUpdated() {
      refreshSessions();
    }

    window.addEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionsUpdated);

    // 3. Listen to remote session termination (broadcast or local)
    const cleanupTerminationListener = listenForSessionTermination((reason) => {
      setTerminatedNotice(reason || 'Your session was terminated from another browser or device.');
      localStorage.removeItem('dentivista_demo_role');
      localStorage.removeItem('clinsyst_active_staff_session');
      setUser(null);
      setStaff(null);
      setSession(null);
    });

    // 4. Handle tab unload
    const handleBeforeUnload = () => {
      endCurrentSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial session restore check
    const demoRole = localStorage.getItem('dentivista_demo_role');
    if (demoRole && DEMO_STAFF_MAP[demoRole]) {
      const demoStaff = DEMO_STAFF_MAP[demoRole];
      const demoUser = {
        id: demoStaff.user_id!,
        email: demoStaff.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;

      setStaff(demoStaff);
      setUser(demoUser);

      // Register session for demo user
      registerSession({
        clinicId: activeClinic.id,
        userId: demoStaff.user_id!,
        userEmail: demoStaff.email,
        userName: demoStaff.name,
        role: demoStaff.role,
        forceTerminateOldest: true,
      });

      refreshSessions();
      setLoading(false);
      return () => {
        window.removeEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
        window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionsUpdated);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        cleanupTerminationListener();
      };
    }

    const savedTenantUserJson = localStorage.getItem('clinsyst_active_staff_session');
    if (savedTenantUserJson) {
      try {
        const saved = JSON.parse(savedTenantUserJson);
        if (saved?.staff && saved?.user) {
          setStaff(saved.staff);
          setUser(saved.user);
          setActiveClinicState(getActiveClinic());

          // Re-heartbeat or register session
          const ok = heartbeatSession();
          if (!ok) {
            registerSession({
              clinicId: getActiveClinic().id,
              userId: saved.staff.user_id || `user-${saved.staff.id}`,
              userEmail: saved.staff.email,
              userName: saved.staff.name,
              role: saved.staff.role,
              forceTerminateOldest: true,
            });
          }

          refreshSessions();
          setLoading(false);
          return () => {
            window.removeEventListener(CLINIC_TENANT_EVENT, handleTenantChange);
            window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionsUpdated);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cleanupTerminationListener();
          };
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
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionsUpdated);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupTerminationListener();
    };
  }, []);

  // Heartbeat loop for active sessions (every 15s)
  useEffect(() => {
    if (!user) return;

    refreshSessions();
    const interval = setInterval(() => {
      const isAlive = heartbeatSession();
      if (!isAlive && !localStorage.getItem('dentivista_demo_role')) {
        // Current session was removed / invalidated externally
        setTerminatedNotice('Your session has ended because another device signed in or session limit was exceeded.');
        signOut();
      } else {
        refreshSessions();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user, activeClinic.id]);

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

    // Register active session for newly created clinic
    registerSession({
      clinicId: result.clinic.id,
      userId: newUser.id,
      userEmail: result.staff.email,
      userName: result.staff.name,
      role: 'admin',
      forceTerminateOldest: true,
    });

    setUser(newUser);
    setStaff(result.staff);
    setActiveClinicState(result.clinic);
    refreshSessions();
    setLoading(false);

    return { error: null };
  }

  function switchClinicTenant(clinicId: string) {
    const updated = setActiveClinic(clinicId);
    setActiveClinicState(updated);
    refreshSessions();
  }

  async function signIn(
    email: string,
    password: string,
    forceTerminateOldest: boolean = false
  ): Promise<{
    error: string | null;
    sessionExceeded?: boolean;
    activeCount?: number;
    maxSessions?: number;
  }> {
    // 1. Check if user is in multi-tenant registry
    const tenantUser = findTenantUser(email);
    if (tenantUser) {
      if (tenantUser.passwordHash && tenantUser.passwordHash !== password) {
        return { error: 'Invalid password. Please check your credentials.' };
      }

      // Check session limits for this clinic
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

      // Register session with concurrent session limit enforcement
      const sessionResult = registerSession({
        clinicId: clinic.id,
        userId: userObj.id,
        userEmail: staffObj.email,
        userName: staffObj.name,
        role: staffObj.role,
        forceTerminateOldest,
      });

      if (!sessionResult.success) {
        return {
          error: sessionResult.error || 'Concurrent session limit reached.',
          sessionExceeded: true,
          activeCount: sessionResult.activeCount,
          maxSessions: sessionResult.maxSessions,
        };
      }

      localStorage.removeItem('dentivista_demo_role');
      localStorage.setItem(
        'clinsyst_active_staff_session',
        JSON.stringify({ staff: staffObj, user: userObj })
      );

      setStaff(staffObj);
      setUser(userObj);
      refreshSessions();
      return { error: null };
    }

    // 2. Otherwise authenticate against Supabase Auth
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Register active session for Supabase user
    if (authData.user) {
      const sessionResult = registerSession({
        clinicId: activeClinic.id,
        userId: authData.user.id,
        userEmail: authData.user.email || email,
        userName: authData.user.user_metadata?.name || 'Clinic Staff',
        role: 'admin',
        forceTerminateOldest,
      });

      if (!sessionResult.success) {
        await supabase.auth.signOut();
        return {
          error: sessionResult.error || 'Concurrent session limit reached.',
          sessionExceeded: true,
          activeCount: sessionResult.activeCount,
          maxSessions: sessionResult.maxSessions,
        };
      }
    }

    localStorage.removeItem('dentivista_demo_role');
    localStorage.removeItem('clinsyst_active_staff_session');
    refreshSessions();
    return { error: null };
  }

  function signInAsDemo(role: 'admin' | 'doctor' | 'receptionist' = 'doctor') {
    seedDemoData(true);
    const demoStaff = DEMO_STAFF_MAP[role] || DEMO_STAFF_MAP.doctor;
    localStorage.setItem('dentivista_demo_role', role);
    localStorage.removeItem('clinsyst_active_staff_session');
    setStaff(demoStaff);
    const demoUser = {
      id: demoStaff.user_id!,
      email: demoStaff.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    setUser(demoUser);

    registerSession({
      clinicId: activeClinic.id,
      userId: demoStaff.user_id!,
      userEmail: demoStaff.email,
      userName: demoStaff.name,
      role: demoStaff.role,
      forceTerminateOldest: true,
    });

    refreshSessions();
    setLoading(false);
  }

  async function signOut() {
    endCurrentSession();
    localStorage.removeItem('dentivista_demo_role');
    localStorage.removeItem('clinsyst_active_staff_session');
    setUser(null);
    setStaff(null);
    setSession(null);
    refreshSessions();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  function terminateSessionById(sessionId: string) {
    terminateSession(sessionId, 'Terminated by clinic administrator.');
    refreshSessions();
  }

  function terminateAllOtherSessions() {
    terminateOtherSessions(activeClinic.id);
    refreshSessions();
  }

  function clearTerminatedNotice() {
    setTerminatedNotice(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff,
        activeClinic,
        activeSessions,
        terminatedNotice,
        loading,
        clearTerminatedNotice,
        terminateSessionById,
        terminateAllOtherSessions,
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
