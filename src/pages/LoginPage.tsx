import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Eye, EyeOff, AlertCircle, Sparkles,
  Pill, Package, FileText, Calendar, ShieldCheck, CheckCircle2,
  Activity, ArrowRight, Building2, User, Phone, MapPin, Check, LogOut,
  KeyRound, Mail, X, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ClinicSignUpData, SubscriptionPlan } from '../lib/types';
import { PLAN_SPECS } from '../lib/tenancy';

interface LoginPageProps {
  onBackToLanding?: () => void;
  initialMode?: 'signin' | 'signup';
  /** Plan pre-selected from the landing page "Start 14-Day Free Trial" buttons */
  initialPlan?: SubscriptionPlan;
  initialBilling?: 'monthly' | 'annual';
}

export default function LoginPage({
  onBackToLanding,
  initialMode = 'signin',
  initialPlan = 'pro',
  initialBilling = 'annual',
}: LoginPageProps) {
  const { signIn, registerClinic, signInAsDemo, terminatedNotice, clearTerminatedNotice } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sessionExceeded, setSessionExceeded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clinic Sign Up State
  const [signupForm, setSignupForm] = useState<ClinicSignUpData>({
    clinic_name: '',
    tagline: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    plan: initialPlan,
  });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBilling);

  // Forgot Password / Recovery State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recovery Mode State (when redirected with password reset link)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    // 1. Detect recovery token from URL hash or query params
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    // 2. Parse any Supabase auth errors (e.g. #error=access_denied&error_description=Redirect+URL+not+allowed)
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search || '');
    const authErrorDesc = hashParams.get('error_description') || searchParams.get('error_description') || hashParams.get('error') || searchParams.get('error');
    if (authErrorDesc) {
      const decoded = decodeURIComponent(authErrorDesc.replace(/\+/g, ' '));
      setError(`Auth Redirect Notice: ${decoded}`);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSendResetLink(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage({ type: 'error', text: 'Please enter your registered staff email address.' });
      return;
    }
    setForgotLoading(true);
    setForgotMessage(null);
    try {
      const redirectUrl = `${window.location.origin}/app/`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) {
        setForgotMessage({ type: 'error', text: error.message });
      } else {
        setForgotMessage({
          type: 'success',
          text: `Password reset link sent to ${forgotEmail.trim()}. Please check your email inbox and click the link to set a new password.`,
        });
      }
    } catch (err: any) {
      setForgotMessage({ type: 'error', text: err?.message || 'Failed to send reset link.' });
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setRecoveryError(error.message);
      } else {
        setRecoverySuccess(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      setRecoveryError(err?.message || 'Failed to update password.');
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleSignInSubmit(e?: React.FormEvent, forceTerminateOldest: boolean = false) {
    if (e) e.preventDefault();
    setError('');
    setSessionExceeded(false);
    setLoading(true);
    const res = await signIn(email, password, forceTerminateOldest);
    if (res.error) {
      setError(res.error);
      if (res.sessionExceeded) {
        setSessionExceeded(true);
      }
    }
    setLoading(false);
  }

  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!signupForm.clinic_name.trim()) {
      setError('Please enter your clinic name');
      return;
    }
    if (!signupForm.owner_name.trim()) {
      setError('Please enter the clinic owner / doctor name');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error: regError } = await registerClinic(signupForm);
    if (regError) {
      setError(regError);
      setLoading(false);
    }
  }

  const productFeatures = [
    {
      icon: Stethoscope,
      title: 'Dual Odontogram Charting',
      desc: 'Interactive 32-tooth adult & 20-tooth pediatric dental charts with surface-level findings (Caries, RCT, Crowns, Fillings, Implants).',
    },
    {
      icon: Activity,
      title: '360° Patient Clinical Dossier',
      desc: 'Chronological timeline consolidating appointments, examinations, treatments, prescriptions, and invoices in one view for clinical research.',
    },
    {
      icon: Pill,
      title: 'Digital Prescriptions & Slip Print',
      desc: 'Streamlined medication regimens with dosage, course duration, clinical advice, and official clinic letterhead printing.',
    },
    {
      icon: Package,
      title: 'Inventory & Stock Control',
      desc: 'Real-time stock monitoring with SKU, batch numbers, automated reorder thresholds, and expiration alerts.',
    },
    {
      icon: FileText,
      title: 'Automated Billing & Invoices',
      desc: 'Itemized invoices with instant status tracking, printable tax receipts, and dynamic clinic setup personalization.',
    },
    {
      icon: Calendar,
      title: 'Intelligent Appointment Calendar',
      desc: 'Visual monthly scheduler with exact time slots, status filters, and one-click quick booking.',
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/60">
      {/* Left branding & product features panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[50%] p-10 xl:p-14 text-white relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, #0284c7 0%, #0369a1 35%, #075985 75%, #0c4a6e 100%)',
        }}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Clinsyst Logo Box */}
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                <div className="w-8 h-8 rounded-xl bg-[#0284c7] flex items-center justify-center text-white font-bold text-xl font-sans shadow-sm border border-white/40">
                  C
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-2xl tracking-tight leading-none font-display">Clinsyst</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white tracking-wide uppercase border border-white/20">
                    v2.0 Multi-Tenant
                  </span>
                </div>
                <p className="text-sky-100 text-xs mt-1 font-medium">Clinic Management & Intelligence Suite</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/95 text-xs font-medium border border-white/20 shadow-xs">
              <Sparkles size={13} className="text-amber-300" />
              <span>Multi-Tenant Architecture</span>
            </div>
          </div>
        </div>

        {/* Hero Headline & Core Mission */}
        <div className="relative z-10 my-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-950/40 text-sky-200 text-xs font-semibold mb-4 border border-sky-400/30">
            <ShieldCheck size={14} className="text-sky-300" />
            <span>Built for Modern Dental & Medical Practices</span>
          </div>

          <h1 className="font-display text-4xl xl:text-5xl text-white font-bold leading-tight mb-4 tracking-tight">
            Complete Clinical Care,<br />
            <span className="text-sky-200">Zero Paperwork Friction.</span>
          </h1>

          <p className="text-sky-100/90 text-sm xl:text-base leading-relaxed max-w-xl">
            Clinsyst unites tooth-by-tooth odontogram charting, real-time inventory control, digital prescription generation, 360° patient dossiers, and automated billing into one effortless workflow.
          </p>

          {/* Interactive Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3.5 mt-7">
            {productFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/10 hover:bg-white/15 backdrop-blur-xs rounded-xl p-3.5 border border-white/15 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sky-200 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Icon size={15} />
                    </div>
                    <p className="text-white font-semibold text-xs xl:text-sm leading-tight truncate">
                      {feat.title}
                    </p>
                  </div>
                  <p className="text-sky-100/75 text-[11px] xl:text-xs leading-relaxed line-clamp-2">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Trust & Security Banner */}
        <div className="relative z-10 pt-6 border-t border-white/20 flex items-center justify-between text-xs text-sky-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-sky-300" />
            <span>Encrypted Health Records</span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-sky-300" />
            <span>Interactive Odontogram Chart</span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-sky-300" />
            <span>Dynamic Invoices & Prescriptions</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg my-auto">
          {/* Mobile branding header */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center shadow-md text-white font-bold text-xl font-sans">
              C
            </div>
            <div>
              <p className="font-display font-bold text-xl text-gray-900 leading-none">Clinsyst</p>
              <p className="text-xs text-sky-700 font-medium mt-0.5">Clinic Management System</p>
            </div>
          </div>

          {/* Back to Landing Page */}
          {onBackToLanding && (
            <div className="mb-4">
              <button
                type="button"
                onClick={onBackToLanding}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1.5 transition-colors group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                <span>Back to Overview & Pricing</span>
              </button>
            </div>
          )}

          {/* Mode Switcher Tabs (Sign In vs Register New Clinic) */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Sign In to Clinic
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Register New Clinic</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full font-semibold">
                Free Trial
              </span>
            </button>
          </div>

          {terminatedNotice && (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-900 font-semibold text-xs">Session Ended</p>
                  <p className="text-amber-700 text-xs mt-0.5">{terminatedNotice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearTerminatedNotice}
                className="text-amber-500 hover:text-amber-800 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-xs font-medium leading-relaxed">{error}</p>
              </div>
              {sessionExceeded && (
                <div className="pt-2 border-t border-red-200/60">
                  <p className="text-xs text-red-800 font-medium mb-2">
                    Would you like to terminate the oldest active session on other devices and log in here?
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSignInSubmit(undefined, true)}
                    className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={14} />
                    Terminate Oldest Session & Log In Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: PASSWORD RECOVERY OR SIGN IN FORM                     */}
          {/* ============================================================ */}
          {isRecoveryMode ? (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 inline-flex items-center gap-1.5">
                  <KeyRound size={12} />
                  <span>Account Security</span>
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 tracking-tight">
                  Set New Password
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  Enter and confirm a new secure password for your clinic account
                </p>
              </div>

              {recoverySuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-emerald-900 font-bold text-sm">Password Updated Successfully!</p>
                  <p className="text-emerald-700 text-xs leading-relaxed">
                    Your new password has been saved. You can now sign in with your updated credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(false);
                      setRecoverySuccess(false);
                      setAuthMode('signin');
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {recoveryError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 text-xs">{recoveryError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-all text-xs outline-none shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-all text-xs outline-none shadow-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-xs"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Save New Password & Continue</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRecoveryMode(false)}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-800 transition-colors py-1"
                  >
                    Cancel & Return to Sign In
                  </button>
                </form>
              )}
            </div>
          ) : authMode === 'signin' ? (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                  Existing Practice Access
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-2 tracking-tight">
                  Welcome back
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  Sign in with your staff email to access your clinic workspace
                </p>
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@dentivista.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-all text-xs outline-none shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotEmail(email);
                        setForgotMessage(null);
                      }}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-all text-xs outline-none shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-md flex items-center justify-center gap-2 text-xs"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <span>{loading ? 'Verifying credentials...' : 'Sign In to Clinsyst'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>

              {/* Quick Demo Access Bar */}
              <div className="pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Instant Demo Access
                  </p>
                  <span className="text-[10px] text-sky-700 font-medium">Click any role to test</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => signInAsDemo('doctor')}
                    className="py-2.5 px-2 bg-sky-50/80 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-0.5 shadow-2xs"
                  >
                    <span className="font-bold">Dr. Sarah</span>
                    <span className="text-[10px] text-sky-700 font-normal">Dentist / Doctor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => signInAsDemo('admin')}
                    className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-0.5 shadow-2xs"
                  >
                    <span className="font-bold">Admin Lead</span>
                    <span className="text-[10px] text-slate-500 font-normal">Full Management</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => signInAsDemo('receptionist')}
                    className="py-2.5 px-2 bg-cyan-50/80 hover:bg-cyan-100/90 text-cyan-900 border border-cyan-200/80 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-0.5 shadow-2xs"
                  >
                    <span className="font-bold">Reception</span>
                    <span className="text-[10px] text-cyan-700 font-normal">Front Desk</span>
                  </button>
                </div>
              </div>

              {/* Prompt to register clinic */}
              <div className="p-4 bg-sky-50/80 border border-sky-200/80 rounded-2xl flex items-center justify-between text-xs text-sky-950">
                <div>
                  <p className="font-bold">New to Clinsyst?</p>
                  <p className="text-[11px] text-sky-800">Set up your clinic with a 14-day free trial</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setError(''); }}
                  className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl font-semibold text-xs transition-colors shadow-xs"
                >
                  Register Clinic
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* TAB 2: MULTI-TENANT CLINIC SIGN UP FORM                       */
            /* ============================================================ */
            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                  14-Day Full Access Trial
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-1 tracking-tight">
                  Register Your Clinic
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Launch your clinic workspace with interactive dental charts, appointments, and billing
                </p>
              </div>

              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Clinic Identity */}
                <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/70">
                  <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={13} className="text-sky-600" />
                    <span>Clinic Information</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Clinic Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.clinic_name}
                        onChange={(e) => setSignupForm({ ...signupForm, clinic_name: e.target.value })}
                        placeholder="e.g. Apex Dental Studio"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Specialization / Tagline
                      </label>
                      <input
                        type="text"
                        value={signupForm.tagline}
                        onChange={(e) => setSignupForm({ ...signupForm, tagline: e.target.value })}
                        placeholder="e.g. Dental & Aesthetics"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Clinic Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        placeholder="+92 300 1234567"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-mono focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Street Address & City *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.address}
                        onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                        placeholder="Plaza 4, Phase 5, Lahore"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Administrator / Doctor Credentials */}
                <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/70">
                  <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-sky-600" />
                    <span>Clinic Owner / Lead Doctor Account</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Doctor / Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signupForm.owner_name}
                        onChange={(e) => setSignupForm({ ...signupForm, owner_name: e.target.value })}
                        placeholder="Dr. Zaid Tariq"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder="doctor@apexdental.com"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Password (min 6 chars) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Selection with Live Seat Limits & Competitive Edge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Select Your Plan Tier
                    </label>
                    <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                          billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                          billingCycle === 'annual' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <span>Annual</span>
                        <span className="text-[9px] bg-emerald-400 text-emerald-950 font-bold px-1 rounded-sm">Save 17%</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['starter', 'pro', 'enterprise'] as SubscriptionPlan[]).map((p) => {
                      const spec = PLAN_SPECS[p];
                      const isSelected = signupForm.plan === p;
                      const displayPrice = billingCycle === 'annual' ? spec.annual_price : spec.price;
                      return (
                        <div
                          key={p}
                          onClick={() => setSignupForm({ ...signupForm, plan: p })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all text-left relative ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/80 shadow-xs ring-1 ring-sky-500'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {spec.badge && (
                            <span
                              className={`absolute -top-2 right-1.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                p === 'starter'
                                  ? 'bg-emerald-600 text-white'
                                  : p === 'pro'
                                  ? 'bg-[#0284c7] text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {spec.badge}
                            </span>
                          )}
                          <p className="font-bold text-xs text-gray-900 capitalize">{p}</p>
                          <p className="text-[11px] font-bold text-sky-800">{displayPrice}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {spec.max_seats} Staff Seats
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Plan description blurb */}
                  <div className="text-[11px] text-sky-900 bg-sky-50/70 p-2 rounded-xl border border-sky-100/80 flex items-start gap-1.5">
                    <span className="font-semibold text-sky-800">Includes:</span>
                    <span>{PLAN_SPECS[signupForm.plan].description}</span>
                  </div>
                </div>

                {/* Trial Guarantee Note */}
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 flex-shrink-0" />
                  <span>
                    Your 14-day free trial starts immediately. No credit card required. Includes up to{' '}
                    <strong>{PLAN_SPECS[signupForm.plan].max_seats} staff seats</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-xs"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <span>{loading ? 'Setting up your clinic workspace...' : 'Launch Clinic Workspace'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          )}

          {/* Security footnote */}
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-sky-600" />
            <span>Clinsyst Secure Multi-Tenant Architecture</span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FORGOT PASSWORD MODAL                                        */}
      {/* ============================================================ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 flex-shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Reset Your Password</h3>
                <p className="text-gray-500 text-xs">Receive a secure link to reset your clinic password</p>
              </div>
            </div>

            {forgotMessage && (
              <div
                className={`p-3.5 rounded-xl mb-4 text-xs flex items-start gap-2.5 ${
                  forgotMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {forgotMessage.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{forgotMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="doctor@dentivista.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 text-xs outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-gray-600 leading-relaxed">
                💡 <span className="font-semibold text-gray-800">Admin instant option:</span> If you are the clinic owner or administrator, you can also reset any staff password directly inside the <span className="font-medium text-sky-800">Staff Module</span> or via the <span className="font-medium text-sky-800">Supabase Auth Dashboard</span>.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 px-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 px-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
