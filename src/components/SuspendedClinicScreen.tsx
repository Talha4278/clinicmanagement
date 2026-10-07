import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, MessageSquare, LogOut, Building2, Clock, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { ClinicTenant } from '../lib/types';

interface SuspendedClinicScreenProps {
  clinic: ClinicTenant;
  isTrialExpired?: boolean;
  onRefreshStatus: () => Promise<ClinicTenant | null>;
  onSignOut: () => void;
}

export default function SuspendedClinicScreen({
  clinic,
  isTrialExpired = false,
  onRefreshStatus,
  onSignOut,
}: SuspendedClinicScreenProps) {
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const supportWhatsApp = '923093622732';
  const whatsappMessage = encodeURIComponent(
    `Assalam o Alaikum, I would like to verify and reactivate access for my clinic: "${clinic.name}" (Clinic ID: ${clinic.id}). Here is my subscription payment screenshot.`
  );
  const whatsappUrl = `https://wa.me/${supportWhatsApp}?text=${whatsappMessage}`;

  async function handleCheckStatus() {
    setChecking(true);
    setFeedback(null);
    try {
      const refreshed = await onRefreshStatus();
      if (refreshed?.status === 'active') {
        setFeedback('Clinic access reactivated! Reloading workspace...');
        setTimeout(() => window.location.reload(), 800);
      } else if (refreshed?.status === 'trial') {
        const expired = refreshed.trial_ends_at && new Date() > new Date(refreshed.trial_ends_at);
        if (!expired) {
          setFeedback('Trial access is active! Reloading workspace...');
          setTimeout(() => window.location.reload(), 800);
        } else {
          setFeedback('Status in database is still expired trial. Contact support on WhatsApp.');
        }
      } else {
        setFeedback('Clinic is still marked as suspended in database. Contact support or update in Supabase.');
      }
    } catch (e: any) {
      setFeedback('Error checking status. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  const isExpired = isTrialExpired || (clinic.status === 'trial' && clinic.trial_ends_at && new Date() > new Date(clinic.trial_ends_at));

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #0d1b10 0%, #15291b 50%, #1a3322 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden text-gray-800">
          {/* Header Banner */}
          <div
            className={`p-6 sm:p-8 text-white relative overflow-hidden ${
              isExpired
                ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900'
                : 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900'
            }`}
          >
            {/* Background geometric accents */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute left-1/2 -top-12 w-36 h-36 rounded-full bg-black/10 blur-lg pointer-events-none" />

            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner border border-white/30">
                {isExpired ? (
                  <Clock className="w-8 h-8 text-white" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                    {isExpired ? 'Trial Expired' : 'Access Suspended'}
                  </span>
                  <span className="text-xs font-semibold text-white/80 uppercase">
                    Plan: {clinic.plan}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {isExpired ? 'Free Trial Period Expired' : 'Clinic Workspace Suspended'}
                </h1>
                <p className="text-sm text-white/85 mt-1 font-medium">
                  {clinic.name}
                </p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Explanation box */}
            <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100 flex items-start gap-3.5">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isExpired ? 'text-amber-600' : 'text-rose-600'}`} />
              <div className="text-sm text-gray-700 leading-relaxed">
                {isExpired ? (
                  <p>
                    Your 14-day full-featured free trial for <strong className="font-semibold text-gray-900">{clinic.name}</strong> has concluded. Your patient records, invoices, and clinical data are safely preserved.
                  </p>
                ) : (
                  <p>
                    Membership access for <strong className="font-semibold text-gray-900">{clinic.name}</strong> has been set to <span className="font-bold text-rose-700 uppercase">Suspended</span> in your clinic database. Access to patient files, appointment schedules, and billing is temporarily held.
                  </p>
                )}
              </div>
            </div>

            {/* Clinic Details Preview */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-2.5 text-xs text-gray-600">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Clinic Tenant ID</span>
                <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{clinic.id}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Owner Name</span>
                <span className="font-medium text-gray-800">{clinic.owner_name} ({clinic.owner_email})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">Database Status</span>
                <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                  clinic.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {clinic.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Feedback alert message */}
            {feedback && (
              <div className={`p-3.5 rounded-xl text-xs font-medium transition-all ${
                feedback.includes('reactivated') || feedback.includes('active')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {feedback}
              </div>
            )}

            {/* Reactivation CTAs */}
            <div className="space-y-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-semibold text-white shadow-lg transition-all transform active:scale-[0.99] text-sm"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                }}
              >
                <MessageSquare className="w-4.5 h-4.5" />
                <span>Send Payment Receipt on WhatsApp (03093622732)</span>
                <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
              </a>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200/80 active:bg-gray-200 transition-colors text-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{checking ? 'Checking...' : 'Check Status'}</span>
                </button>

                <button
                  onClick={onSignOut}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Footer notice */}
            <p className="text-center text-[11px] text-gray-400 leading-tight">
              Once you update the status in your Supabase dashboard or support approves your payment, this screen updates in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
