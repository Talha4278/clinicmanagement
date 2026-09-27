import React, { useState } from 'react';
import {
  X, MessageSquare, Copy, Check, Send, Phone,
  User, Calendar, Clock, DollarSign, Stethoscope, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useClinicSettings } from '../lib/clinicSettings';
import { cleanPhoneNumber, openWhatsAppChat } from '../lib/whatsapp';

export interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  patientName: string;
  patientPhone: string;
  initialMessage: string;
  metadata?: {
    procedure?: string;
    date?: string;
    time?: string;
    doctorName?: string;
    totalAmount?: number;
    pendingAmount?: number;
    invoiceNumber?: string;
    statusBadge?: string;
  };
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  title,
  patientName,
  patientPhone,
  initialMessage,
  metadata,
}: WhatsAppModalProps) {
  const { settings: clinic } = useClinicSettings();
  const [phone, setPhone] = useState(patientPhone);
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  // Sync state when props change
  React.useEffect(() => {
    setPhone(patientPhone);
    setMessage(initialMessage);
    setSentNotice(false);
  }, [patientPhone, initialMessage, isOpen]);

  if (!isOpen) return null;

  const cleaned = cleanPhoneNumber(phone);
  const isPakistani = cleaned.startsWith('92');

  function handleSend() {
    openWhatsAppChat(phone, message);
    setSentNotice(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  function handleCopy() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with WhatsApp Branding */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ background: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-snug">{title}</h3>
              <p className="text-white/80 text-xs">
                Clinsyst WhatsApp Messenger · {clinic.clinic_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-gray-800">
          {/* Recipient Strip */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <User size={15} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{patientName || 'Valued Patient'}</p>
                <p className="text-gray-500 text-[11px]">Recipient Patient</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone size={13} className="text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 font-mono text-xs font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none w-36"
              />
              {cleaned && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                  +{cleaned}
                </span>
              )}
            </div>
          </div>

          {/* Quick Details Badges */}
          {metadata && (
            <div className="flex flex-wrap gap-2 text-xs">
              {metadata.procedure && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                  <Stethoscope size={12} />
                  <span>{metadata.procedure}</span>
                </div>
              )}
              {metadata.date && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium border border-purple-100">
                  <Calendar size={12} />
                  <span>{metadata.date}</span>
                </div>
              )}
              {metadata.time && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-medium border border-amber-100">
                  <Clock size={12} />
                  <span>{metadata.time}</span>
                </div>
              )}
              {metadata.pendingAmount !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-bold border border-red-200">
                  <DollarSign size={12} />
                  <span>Pending: Rs. {metadata.pendingAmount.toLocaleString()}</span>
                </div>
              )}
              {metadata.statusBadge && (
                <div className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700 capitalize">
                  {metadata.statusBadge}
                </div>
              )}
            </div>
          )}

          {/* Editable Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span>Personalized Message Content</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400">{message.length} chars</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <textarea
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-xs font-sans text-gray-900 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none transition-all shadow-inner"
            />
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>Personalized with patient's name, procedure, clinic contact, and billing details.</span>
            </p>
          </div>

          {/* Sent Notice Banner */}
          {sentNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={14} className="text-emerald-600" />
              <span>Launching WhatsApp chat with {patientName}...</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-xl transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md hover:opacity-95 active:scale-95"
              style={{ background: '#25D366' }}
            >
              <Send size={14} />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
