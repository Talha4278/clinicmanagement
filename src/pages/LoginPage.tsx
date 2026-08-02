import React, { useState } from 'react';
import { Stethoscope, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
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

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: '#3c5e27' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg leading-none">Dentivista</p>
            <p className="text-white/60 text-xs">Dental & Aesthetics</p>
          </div>
        </div>

        <div>
          <h1 className="font-display text-5xl text-white leading-tight mb-6">
            Clinic Management<br />System
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            Streamline patient care, billing, and practice operations — all in one elegant platform designed for modern dental clinics.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Patients', value: 'Managed' },
            { label: 'Invoices', value: 'Automated' },
            { label: 'Reports', value: 'Real-time' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-white/50 text-xs mb-1">{stat.label}</p>
              <p className="text-white font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3c5e27' }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Dentivista</p>
              <p className="text-xs text-gray-500">Dental & Aesthetics</p>
            </div>
          </div>

          <h2 className="font-display text-3xl text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">
            Sign in to your clinic management account
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dentivista.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all"
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
              className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: '#3c5e27' }}
            >
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
