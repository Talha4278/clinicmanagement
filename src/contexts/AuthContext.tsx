import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Staff } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  staff: Staff | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsDemo: (role?: 'admin' | 'doctor' | 'receptionist') => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_STAFF_MAP: Record<string, Staff> = {
  doctor: {
    id: 'staff-demo-doc',
    user_id: 'user-demo-doc',
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
      return;
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
      } else if (!localStorage.getItem('dentivista_demo_role')) {
        setStaff(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    localStorage.removeItem('dentivista_demo_role');
    return { error: null };
  }

  function signInAsDemo(role: 'admin' | 'doctor' | 'receptionist' = 'doctor') {
    const demoStaff = DEMO_STAFF_MAP[role] || DEMO_STAFF_MAP.doctor;
    localStorage.setItem('dentivista_demo_role', role);
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
    <AuthContext.Provider value={{ user, session, staff, loading, signIn, signInAsDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
