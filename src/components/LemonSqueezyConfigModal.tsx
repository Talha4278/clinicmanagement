import React, { useState } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Key,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { PaymentGatewayConfig } from '../lib/types';
import { useClinicSettings, saveClinicSettings } from '../lib/clinicSettings';
import { validateProductionPaymentConfig, ValidationResult } from '../lib/payments';

interface LemonSqueezyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function LemonSqueezyConfigModal({
  isOpen,
  onClose,
  onSaved,
}: LemonSqueezyConfigModalProps) {
  const { settings, updateSettings } = useClinicSettings();
  const currentConfig: PaymentGatewayConfig = settings.payment_gateway_config || {
    enabled: true,
    provider: 'lemon_squeezy',
    test_mode: true,
  };

  const [form, setForm] = useState<PaymentGatewayConfig>({
    ...currentConfig,
    provider: 'lemon_squeezy',
    lemon_squeezy_store_id: currentConfig.lemon_squeezy_store_id || (import.meta as any).env?.VITE_LEMON_SQUEEZY_STORE_ID || '490757',
    secret_key: currentConfig.secret_key || (import.meta as any).env?.VITE_LEMON_SQUEEZY_API_KEY || (import.meta as any).env?.LEMON_SQUEEZY_API_KEY || '',
    webhook_secret: currentConfig.webhook_secret || (import.meta as any).env?.VITE_LEMON_SQUEEZY_WEBHOOK_SECRET || (import.meta as any).env?.LEMON_SQUEEZY_WEBHOOK_SECRET || 'clinsyst_secret_2026',
    test_mode: currentConfig.test_mode !== false, // default to test mode for safety
    price_ids: {
      starter_monthly: currentConfig.price_ids?.starter_monthly || (import.meta as any).env?.VITE_LS_VARIANT_STARTER || '1463186',
      starter_annual: currentConfig.price_ids?.starter_annual || (import.meta as any).env?.VITE_LS_VARIANT_STARTER || '1463186',
      pro_monthly: currentConfig.price_ids?.pro_monthly || (import.meta as any).env?.VITE_LS_VARIANT_PRO || '1463186',
      pro_annual: currentConfig.price_ids?.pro_annual || (import.meta as any).env?.VITE_LS_VARIANT_PRO || '1463186',
      enterprise_monthly: currentConfig.price_ids?.enterprise_monthly || (import.meta as any).env?.VITE_LS_VARIANT_ENTERPRISE || '1463186',
      enterprise_annual: currentConfig.price_ids?.enterprise_annual || (import.meta as any).env?.VITE_LS_VARIANT_ENTERPRISE || '1463186',
    },
  });

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validateProductionPaymentConfig(form)
  );

  const webhookUrl = `${window.location.origin.includes('localhost') ? 'https://scwnoixdnhzkefylqkja.supabase.co' : window.location.origin}/functions/v1/payment-webhook?provider=lemon_squeezy`;

  if (!isOpen) return null;

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updatedConfig: PaymentGatewayConfig = {
      ...currentConfig,
      ...form,
      provider: 'lemon_squeezy',
      enabled: true,
    };

    updateSettings({
      ...settings,
      payment_gateway_config: updatedConfig,
    });
    saveClinicSettings({
      payment_gateway_config: updatedConfig,
    });

    const val = validateProductionPaymentConfig(updatedConfig);
    setValidation(val);
    setSaveSuccess(true);
    if (onSaved) onSaved();

    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  }

  function handleValidate() {
    const val = validateProductionPaymentConfig(form);
    setValidation(val);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className="p-6 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    Lemon Squeezy Checkout Setup
                  </h3>
                  <p className="text-xs text-sky-100">
                    Merchant of Record • Global Credit & Debit Cards • Automated VAT / Sales Tax
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-medium text-sky-100">
            <span className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-300" />
              No US/UK Company Required
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
              Visa • Mastercard • Amex • Apple Pay • Google Pay
            </span>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* Environment Mode Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                Environment / Processing Mode
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {form.test_mode
                  ? 'Sandbox Mode Active: Cards are simulated using Lemon Squeezy test cards. Real funds will not be charged.'
                  : 'Live Production Mode Active: Real credit & debit cards will be processed through your Lemon Squeezy store.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, test_mode: !form.test_mode });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                form.test_mode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-600 text-white shadow-xs'
              }`}
            >
              <span>{form.test_mode ? '🧪 Test Sandbox' : '🟢 Live Production'}</span>
            </button>
          </div>

          {/* Store Credentials */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={14} className="text-sky-600" />
              <span>Store Credentials</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lemon Squeezy Store ID / Subdomain *
                </label>
                <input
                  type="text"
                  value={form.lemon_squeezy_store_id || ''}
                  onChange={(e) => setForm({ ...form, lemon_squeezy_store_id: e.target.value.trim() })}
                  placeholder="e.g. 12345 or myclinic"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Find under Lemon Squeezy &rarr; Settings &rarr; Stores
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  API Key (Secret Key)
                </label>
                <input
                  type="password"
                  value={form.secret_key || ''}
                  onChange={(e) => setForm({ ...form, secret_key: e.target.value.trim() })}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Find under Settings &rarr; API &rarr; API Keys
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Webhook Signing Secret
              </label>
              <input
                type="password"
                value={form.webhook_secret || ''}
                onChange={(e) => setForm({ ...form, webhook_secret: e.target.value.trim() })}
                placeholder="Signing secret created in Webhooks settings"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 outline-none"
              />
            </div>
          </div>

          {/* Webhook Endpoint */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-1.5">
            <span className="text-xs font-bold text-sky-950 flex items-center justify-between">
              <span>Your Supabase Webhook Endpoint</span>
              <a
                href="https://app.lemonsqueezy.com/settings/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 font-semibold"
              >
                <span>Add in Lemon Squeezy</span>
                <ExternalLink size={11} />
              </a>
            </span>
            <p className="text-[11px] text-sky-900/80 leading-snug">
              Add this Webhook URL in Lemon Squeezy to automatically synchronize subscription upgrades and renewals:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-1.5 text-[11px] font-mono bg-white rounded-lg border border-sky-300 text-sky-950 select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 transition-colors shadow-xs"
              >
                {copiedWebhook ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Plan Variant IDs */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-sky-600" />
              <span>Subscription Product Variant IDs</span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Create your 3 subscription tiers in Lemon Squeezy and map their numeric Variant IDs below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Starter */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">Solo Practice (Starter)</span>
                <div>
                  <label className="text-[10px] text-gray-500 block">Monthly Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.starter_monthly || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, starter_monthly: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78291"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block">Annual Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.starter_annual || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, starter_annual: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78292"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              </div>

              {/* Pro */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">Clinic Pro (Growth)</span>
                <div>
                  <label className="text-[10px] text-gray-500 block">Monthly Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.pro_monthly || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, pro_monthly: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78293"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block">Annual Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.pro_annual || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, pro_annual: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78294"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              </div>

              {/* Enterprise */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">Hospital Enterprise</span>
                <div>
                  <label className="text-[10px] text-gray-500 block">Monthly Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.enterprise_monthly || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, enterprise_monthly: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78295"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block">Annual Variant ID</label>
                  <input
                    type="text"
                    value={form.price_ids?.enterprise_annual || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_ids: { ...form.price_ids, enterprise_annual: e.target.value.trim() },
                      })
                    }
                    placeholder="e.g. 78296"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Validation Checklist Output */}
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Readiness Checklist</span>
              </span>
              <button
                type="button"
                onClick={handleValidate}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>Re-check</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {validation.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {item.status === 'pass' && (
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  {item.status === 'warn' && (
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  {item.status === 'fail' && (
                    <X size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-gray-800">{item.label}: </span>
                    <span className="text-gray-600 text-[11px]">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Lemon Squeezy credentials successfully saved!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
