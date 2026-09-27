import React, { useState } from 'react';
import {
  Building2, Save, Upload, RefreshCw, CheckCircle2,
  Phone, Mail, MapPin, Globe, FileText, Image as ImageIcon,
  Stethoscope, Shield, Sparkles, HeartPulse, Activity,
  MessageSquare, Key, Link as LinkIcon, Send, BellRing, Settings2
} from 'lucide-react';
import { useClinicSettings, DEFAULT_CLINIC_SETTINGS } from '../lib/clinicSettings';
import { ClinicSettings, WhatsAppConfig, WhatsAppProvider } from '../lib/types';
import { openWhatsAppChat } from '../lib/whatsapp';

const PRESET_ICONS = [
  { id: 'stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { id: 'heartpulse', label: 'Heart Pulse', icon: HeartPulse },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'shield', label: 'Shield Care', icon: Shield },
  { id: 'sparkles', label: 'Aesthetics', icon: Sparkles },
  { id: 'building', label: 'Clinic', icon: Building2 },
];

export default function ClinicSetup() {
  const { settings, updateSettings } = useClinicSettings();
  const [form, setForm] = useState<ClinicSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedPresetIcon, setSelectedPresetIcon] = useState('stethoscope');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setForm({ ...form, logo_url: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clinic_name.trim()) {
      alert('Clinic Name is required');
      return;
    }
    updateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  }

  function handleReset() {
    if (confirm('Reset clinic settings to default values?')) {
      setForm({ ...DEFAULT_CLINIC_SETTINGS });
      updateSettings({ ...DEFAULT_CLINIC_SETTINGS });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  }

  function updateWhatsAppConfig(partial: Partial<WhatsAppConfig>) {
    setForm(prev => ({
      ...prev,
      whatsapp_config: {
        ...(prev.whatsapp_config || {
          enabled: true,
          provider: 'direct_web',
          business_number: prev.phone || '',
          api_endpoint: 'https://graph.facebook.com/v19.0',
          api_key: '',
          phone_number_id: '',
          account_sid: '',
          webhook_url: 'https://api.yourclinic.com/webhooks/whatsapp',
          auto_remind_hours_before: 24,
        }),
        ...partial,
      },
    }));
  }

  function handleTestWhatsApp() {
    const targetPhone = form.whatsapp_config?.business_number || form.phone;
    if (!targetPhone) {
      alert('Please enter a WhatsApp contact number first.');
      return;
    }
    const testMsg = `🌟 *Clinsyst WhatsApp Gateway Test*\n\nHello from *${form.clinic_name || 'Clinsyst'}*! Your WhatsApp reminder gateway is successfully configured and ready to dispatch personalized appointment reminders and invoice follow-ups.`;
    openWhatsAppChat(targetPhone, testMsg);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Building2 className="text-emerald-700" size={26} />
            Clinic Setup & Profile
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure your clinic name, custom logo/icon, contact info, address, and invoice headers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw size={13} /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>Clinic settings successfully updated! Invoices and prescription headers are now synchronized with your new information.</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Previews on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Panel (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 card-shadow space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Clinic Identity & Branding
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              These details will automatically appear on all invoices, receipts, and prescription slips.
            </p>
          </div>

          {/* Clinic Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Clinic Name *
              </label>
              <input
                type="text"
                required
                value={form.clinic_name}
                onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                placeholder="e.g. Dentivista"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Tagline / Specialization
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="e.g. Dental & Aesthetics"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
              />
            </div>
          </div>

          {/* Logo / Icon Upload & Select */}
          <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
            <label className="block text-xs font-semibold text-gray-700 uppercase">
              Clinic Icon / Logo
            </label>

            <div className="flex items-center gap-4">
              {/* Preview Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center overflow-hidden border-2 border-emerald-600/50 shadow-md flex-shrink-0">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Clinic Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Stethoscope size={30} />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs">
                    <Upload size={13} /> Upload Image (PNG/JPG)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: '' })}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-gray-400" />
                  <input
                    type="url"
                    value={form.logo_url || ''}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-[11px] text-gray-800 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Quick Icon Selector when no custom image */}
            {!form.logo_url && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1.5">
                  Or pick a clinic badge style:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((p) => {
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPresetIcon(p.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          selectedPresetIcon === p.id
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <IconComp size={13} /> {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Official Contact & Address
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Contact Phone / Mobile *
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300 0000000"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinic Email Address *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="clinic@dentivista.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinic Full Address *
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    rows={2}
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Floor, Plaza, Street, City..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Website / Portal
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.website || ''}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="www.yourclinic.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax / License Registration #
                </label>
                <input
                  type="text"
                  value={form.tax_number || ''}
                  onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                  placeholder="e.g. NTN-8921-D"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Reminder Notification & Gateway Configuration */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    WhatsApp Reminders & API Setup
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configure WhatsApp messaging for appointment reminders, post-care follow-ups & unpaid invoices
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsapp_config?.enabled ?? true}
                  onChange={(e) => updateWhatsAppConfig({ enabled: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-gray-700">Service Active</span>
              </label>
            </div>

            {/* Config Fields */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Dispatch Mode / Provider
                  </label>
                  <select
                    value={form.whatsapp_config?.provider || 'direct_web'}
                    onChange={(e) => updateWhatsAppConfig({ provider: e.target.value as WhatsAppProvider })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium text-xs text-gray-800 focus:ring-2 focus:ring-emerald-600/20"
                  >
                    <option value="direct_web">Direct WhatsApp Web / App (1-Click Send - Recommended)</option>
                    <option value="cloud_api">Meta WhatsApp Cloud API (Graph API)</option>
                    <option value="twilio">Twilio WhatsApp Messaging</option>
                    <option value="ultramsg">UltraMsg / Green API Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    WhatsApp Business / Sender Phone
                  </label>
                  <input
                    type="text"
                    value={form.whatsapp_config?.business_number || ''}
                    onChange={(e) => updateWhatsAppConfig({ business_number: e.target.value })}
                    placeholder="e.g. +92 300 0979185"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 font-mono"
                  />
                </div>
              </div>

              {/* API Credentials Placeholders (Meta Cloud API / Twilio) */}
              <div className="pt-2 border-t border-gray-200/60 space-y-3">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} className="text-emerald-700" />
                  <span>API Authentication Placeholders (For Automated Cloud Senders)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Phone Number ID / Instance ID
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.phone_number_id || ''}
                      onChange={(e) => updateWhatsAppConfig({ phone_number_id: e.target.value })}
                      placeholder="e.g. 109283746591023 (WhatsApp Phone ID)"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Account SID / WABA ID
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.account_sid || ''}
                      onChange={(e) => updateWhatsAppConfig({ account_sid: e.target.value })}
                      placeholder="e.g. 102938475610293 (WhatsApp Business Account ID)"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Permanent Access Token / API Key
                    </label>
                    <input
                      type="password"
                      value={form.whatsapp_config?.api_key || ''}
                      onChange={(e) => updateWhatsAppConfig({ api_key: e.target.value })}
                      placeholder="e.g. EAABw... or twilio_auth_token"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Webhook / Delivery Callback URL
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp_config?.webhook_url || ''}
                      onChange={(e) => updateWhatsAppConfig({ webhook_url: e.target.value })}
                      placeholder="https://api.yourclinic.com/webhooks/whatsapp"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Supported Dynamic Tags Info */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-700" />
                  <span>Personalization Tokens Auto-Injected:</span>
                </p>
                <p className="text-emerald-800/90 leading-relaxed font-mono">
                  &#123;patient_name&#125;, &#123;procedure&#125;, &#123;date&#125;, &#123;time&#125;, &#123;doctor_name&#125;, &#123;total_amount&#125;, &#123;pending_amount&#125;, &#123;invoice_number&#125;, &#123;clinic_name&#125;, &#123;clinic_phone&#125;
                </p>
              </div>

              {/* Test Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-500">
                  Verify notification format with your clinic phone
                </span>
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Send size={12} /> Test WhatsApp Message
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
              style={{ background: '#3c5e27' }}
            >
              <Save size={15} /> Save Clinic Setup
            </button>
          </div>
        </form>

        {/* Live Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-emerald-700" />
                Live Invoice Header Preview
              </h4>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                Synchronized
              </span>
            </div>

            {/* Rendered mini invoice preview */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm text-white">
              {/* Header */}
              <div className="p-4" style={{ background: '#3c5e27' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-display font-bold text-lg text-white leading-tight">
                        {form.clinic_name || 'Clinic Name'}
                      </h5>
                      <p className="text-white/80 text-[11px]">
                        {form.tagline || 'Specialization'}
                      </p>
                      <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">
                        {form.address || 'Clinic Address'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/50 block">Invoice</span>
                    <span className="font-mono text-xs font-bold text-white">INV-0042</span>
                  </div>
                </div>
              </div>

              {/* Sample Body */}
              <div className="bg-white p-4 text-gray-800 space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px] text-gray-500">
                  <span>Contact: {form.phone}</span>
                  <span>Email: {form.email}</span>
                </div>
                <div className="py-2 text-[11px] text-gray-400 italic text-center">
                  Invoice line items and patient charges will render here...
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                <span>{form.clinic_name} · All Rights Reserved</span>
                <span className="font-semibold text-gray-700">{form.phone}</span>
              </div>
            </div>
          </div>

          {/* Live Prescription Header Preview */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Stethoscope size={14} className="text-emerald-700" />
              Live Prescription Slip Preview
            </h4>

            <div className="p-4 border-2 border-emerald-800/80 rounded-2xl bg-white text-gray-900 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden"
                    style={{ background: '#3c5e27' }}
                  >
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Stethoscope size={16} />
                    )}
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-base text-gray-900 leading-none">
                      {form.clinic_name}
                    </h5>
                    <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider mt-0.5">
                      {form.tagline}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-gray-500">
                  <p>{form.phone}</p>
                  <p>{form.email}</p>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 border-t border-gray-100 pt-1.5">
                {form.address} {form.website ? `· ${form.website}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
