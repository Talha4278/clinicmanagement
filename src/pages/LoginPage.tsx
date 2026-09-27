import React, { useState } from 'react';
import {
  Stethoscope, Eye, EyeOff, AlertCircle, Sparkles,
  Pill, Package, FileText, Calendar, ShieldCheck, CheckCircle2,
  Activity, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, signInAsDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
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
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      {/* Left branding & product features panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] p-10 xl:p-14 text-white relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, #4a7530 0%, #3c5e27 45%, #243c17 100%)'
        }}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-xl tracking-tight leading-none font-display">Clinsyst</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white tracking-wide uppercase">
                    v2.0
                  </span>
                </div>
                <p className="text-white/70 text-xs mt-1 font-medium">Next-Gen Clinic Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium border border-white/10">
              <Sparkles size={13} className="text-amber-300" />
              <span>Smart Practice Suite</span>
            </div>
          </div>
        </div>

        {/* Hero Headline & Core Mission */}
        <div className="relative z-10 my-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-900/40 text-emerald-200 text-xs font-semibold mb-4 border border-emerald-400/20">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Built for Modern Dental & Medical Practices</span>
          </div>

          <h1 className="font-display text-4xl xl:text-5xl text-white font-bold leading-tight mb-4 tracking-tight">
            Complete Clinical Care,<br />
            <span className="text-emerald-200">Zero Paperwork Friction.</span>
          </h1>

          <p className="text-white/80 text-sm xl:text-base leading-relaxed max-w-xl">
            Clinsyst unites tooth-by-tooth odontogram charting, real-time inventory control, digital prescription generation, 360° patient dossiers, and automated billing into one effortless workflow.
          </p>

          {/* Interactive Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3.5 mt-7">
            {productFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/10 hover:bg-white/15 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-emerald-200 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Icon size={15} />
                    </div>
                    <p className="text-white font-semibold text-xs xl:text-sm leading-tight truncate">
                      {feat.title}
                    </p>
                  </div>
                  <p className="text-white/70 text-[11px] xl:text-xs leading-relaxed line-clamp-2">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Trust & Security Banner */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-white/75">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-300" />
            <span>Encrypted Health Records</span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-300" />
            <span>Interactive Odontogram Chart</span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-300" />
            <span>Dynamic Invoices & Prescriptions</span>
          </div>
        </div>
      </div>

      {/* Right sign-in form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile branding header */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#3c5e27' }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-gray-900 leading-none">Clinsyst</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Clinic Management System</p>
            </div>
          </div>

          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              Secure Sign In
            </span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">
              Sign in to manage your practice, patients, and clinical records
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Staff Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinsyst.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-sm outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-sm flex items-center justify-center gap-2 text-sm"
              style={{ background: '#3c5e27' }}
            >
              <span>{loading ? 'Verifying credentials...' : 'Sign In to Clinsyst'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Instant Demo Access
              </p>
              <span className="text-[11px] text-emerald-700 font-medium">Click any role to test</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => signInAsDemo('doctor')}
                className="py-3 px-2 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
              >
                <span className="font-bold">Dr. Sarah</span>
                <span className="text-[10px] text-emerald-700 font-normal">Dentist / Doctor</span>
              </button>
              <button
                type="button"
                onClick={() => signInAsDemo('admin')}
                className="py-3 px-2 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
              >
                <span className="font-bold">Admin Lead</span>
                <span className="text-[10px] text-slate-500 font-normal">Full Management</span>
              </button>
              <button
                type="button"
                onClick={() => signInAsDemo('receptionist')}
                className="py-3 px-2 bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
              >
                <span className="font-bold">Reception</span>
                <span className="text-[10px] text-amber-700 font-normal">Front Desk Desk</span>
              </button>
            </div>
          </div>

          {/* Security footnote */}
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Clinsyst Secure Clinical Architecture</span>
          </p>
        </div>
      </div>
    </div>
  );
}

