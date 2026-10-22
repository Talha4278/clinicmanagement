import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Printer,
  Check,
  RefreshCw,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { SubscriptionPlan } from '../lib/types';
import { INTERNATIONAL_PLANS } from '../lib/internationalPricing';
import { updateClinicPlan, PLAN_SPECS } from '../lib/tenancy';
import { useClinicSettings } from '../lib/clinicSettings';
import { launchGlobalCheckout } from '../lib/payments';

export interface CreditCardCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: SubscriptionPlan;
  initialBillingCycle?: 'monthly' | 'annual';
  currency?: 'USD' | 'PKR';
  clinicId?: string;
  clinicName?: string;
  customerEmail?: string;
  onSuccess?: (details: { transactionId: string; planId: SubscriptionPlan }) => void;
  onOpenConfig?: () => void;
}

export default function CreditCardCheckoutModal({
  isOpen,
  onClose,
  planId = 'pro',
  initialBillingCycle = 'annual',
  currency = 'USD',
  clinicId = '',
  clinicName = '',
  customerEmail = '',
  onSuccess,
  onOpenConfig,
}: CreditCardCheckoutModalProps) {
  const { settings } = useClinicSettings();
  const gatewayConfig = settings.payment_gateway_config || {
    enabled: true,
    provider: 'lemon_squeezy',
    test_mode: true,
  };

  const isTestMode = gatewayConfig.test_mode !== false;
  const storeId = gatewayConfig.lemon_squeezy_store_id || (import.meta as any).env?.VITE_LEMON_SQUEEZY_STORE_ID || '490757';

  // Form State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(planId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBillingCycle);
  const [cardholderName, setCardholderName] = useState(clinicName || 'Clinic Administrator');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState(customerEmail || '');

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    amountPaid: string;
    cardLast4: string;
    cardBrand: string;
    date: string;
    planName: string;
    billingCycle: 'monthly' | 'annual';
  } | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (planId) setSelectedPlan(planId);
    if (initialBillingCycle) setBillingCycle(initialBillingCycle);
    if (customerEmail && !email) setEmail(customerEmail);
    if (clinicName && (!cardholderName || cardholderName === 'Clinic Administrator')) {
      setCardholderName(clinicName);
    }
  }, [planId, initialBillingCycle, customerEmail, clinicName]);

  if (!isOpen) return null;

  // Selected plan metadata
  const currentPlanMeta =
    INTERNATIONAL_PLANS.find((p) => p.id === selectedPlan) || INTERNATIONAL_PLANS[1];
  const priceData = currentPlanMeta.pricing[currency] || currentPlanMeta.pricing.USD;
  const formattedPrice =
    billingCycle === 'annual'
      ? `${currency === 'PKR' ? 'Rs. ' : '$'}${priceData.annualTotal.toLocaleString()}/year`
      : `${currency === 'PKR' ? 'Rs. ' : '$'}${priceData.monthly.toLocaleString()}/month`;

  // Detect card brand based on first digits
  function detectCardBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'generic' {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'generic';
  }

  const cardBrand = detectCardBrand(cardNumber);

  // Auto-format card number with spaces every 4 digits
  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  }

  // Auto-format expiry MM/YY
  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setExpiry(val);
  }

  // Quick fill test card
  function handleQuickFill(type: 'visa' | 'mastercard' | 'amex') {
    if (type === 'visa') {
      setCardNumber('4242 4242 4242 4242');
      setExpiry('12/28');
      setCvc('123');
      setPostalCode('10001');
    } else if (type === 'mastercard') {
      setCardNumber('5555 5555 5555 4444');
      setExpiry('08/29');
      setCvc('888');
      setPostalCode('90210');
    } else {
      setCardNumber('3782 822463 10005');
      setExpiry('11/27');
      setCvc('2024');
      setPostalCode('SW1A 1AA');
    }
  }

  // Trigger Checkout Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // In Live Mode with Store ID configured: Launch Lemon Squeezy Official Hosted/Overlay Checkout
    if (!isTestMode && storeId) {
      setIsProcessing(true);
      setProcessStep('Redirecting to Lemon Squeezy secure hosted checkout...');
      try {
        await launchGlobalCheckout({
          planId: selectedPlan,
          planName: currentPlanMeta.name,
          priceUSD: priceData.monthly,
          billingCycle,
          customerEmail: email,
          clinicId,
          clinicName,
          currency,
          priceDisplay: formattedPrice,
          onSuccess: (details) => {
            if (clinicId) {
              updateClinicPlan(clinicId, selectedPlan);
            }
            if (onSuccess) {
              onSuccess({ transactionId: details.transactionId, planId: selectedPlan });
            }
            setReceiptData({
              transactionId: details.transactionId,
              amountPaid: formattedPrice,
              cardLast4: cardNumber ? cardNumber.slice(-4) : 'Lemon Squeezy Direct',
              cardBrand: 'Lemon Squeezy MoR',
              date: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              planName: currentPlanMeta.name,
              billingCycle,
            });
            setIsProcessing(false);
          },
          onCancel: () => {
            setIsProcessing(false);
          },
        });
      } catch (err) {
        setIsProcessing(false);
      }
      return;
    }

    // Interactive Authorization Simulation (Sandbox / Test Mode)
    setIsProcessing(true);
    setProcessStep('1/3: Contacting Lemon Squeezy Merchant of Record...');

    setTimeout(() => {
      setProcessStep('2/3: Performing 3D Secure Cardholder Authentication...');
      setTimeout(() => {
        setProcessStep('3/3: Activating Clinic Subscription in Supabase Database...');

        setTimeout(() => {
          const generatedTxId = `ls_sub_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`;

          // Immediately update database and local storage plan state
          if (clinicId) {
            updateClinicPlan(clinicId, selectedPlan);
          }

          if (onSuccess) {
            onSuccess({
              transactionId: generatedTxId,
              planId: selectedPlan,
            });
          }

          setReceiptData({
            transactionId: generatedTxId,
            amountPaid: formattedPrice,
            cardLast4: cardNumber ? cardNumber.replace(/\s/g, '').slice(-4) : '4242',
            cardBrand: cardBrand.toUpperCase(),
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            planName: currentPlanMeta.name,
            billingCycle,
          });

          setIsProcessing(false);
        }, 800);
      }, 700);
    }, 700);
  }

  function handlePrintReceipt() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-sky-950 to-gray-900 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Credit & Debit Card Checkout</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/30 text-sky-200 border border-sky-400/30 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  Lemon Squeezy MoR
                </span>
              </div>
              <p className="text-xs text-sky-200/80">
                Global VAT & Sales Tax Handled Automatically • 256-Bit SSL Encrypted
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* RECEIPT SUCCESS VIEW */}
          {receiptData ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-sky-50 border-2 border-emerald-300 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
                  <CheckCircle2 size={34} />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                    Subscription Activated
                  </span>
                  <h4 className="text-xl font-extrabold text-gray-900 mt-2 font-display">
                    Payment Authorized Successfully!
                  </h4>
                  <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                    Your clinic workspace has been upgraded to the{' '}
                    <strong className="text-gray-900 font-bold">{receiptData.planName}</strong> plan.
                    Seats and concurrent session quotas are active immediately.
                  </p>
                </div>

                {/* Receipt Details Table */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-left text-xs space-y-2.5 mt-4 max-w-lg mx-auto shadow-xs">
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Transaction Reference:</span>
                    <span className="font-mono font-bold text-gray-900">{receiptData.transactionId}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Clinic Name:</span>
                    <span className="font-bold text-gray-900">{clinicName || 'Clinic Workspace'}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Activated Plan:</span>
                    <span className="font-bold text-sky-700">
                      {receiptData.planName} ({PLAN_SPECS[selectedPlan].max_seats} Seats /{' '}
                      {PLAN_SPECS[selectedPlan].max_sessions} Sessions)
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Billing Frequency:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {receiptData.billingCycle} Subscription
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Payment Instrument:</span>
                    <span className="font-semibold text-gray-800">
                      {receiptData.cardBrand} •••• {receiptData.cardLast4}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-100">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{receiptData.amountPaid}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Authorized At:</span>
                    <span>{receiptData.date}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <Printer size={15} />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-600/20"
                  >
                    <span>Return to Clinic Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Plan & Cycle Summary Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-indigo-50/40 border border-sky-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      Selected Plan: {currentPlanMeta.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800">
                      {PLAN_SPECS[selectedPlan].max_seats} Seats • {PLAN_SPECS[selectedPlan].max_sessions} Logins
                    </span>
                  </div>

                  {/* Billing Cycle Switcher */}
                  <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        billingCycle === 'annual'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <span>Annual</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-400 text-emerald-950 rounded-full font-black">
                        -20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plan Tier Selector */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {INTERNATIONAL_PLANS.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    const pPrice = p.pricing[currency] || p.pricing.USD;
                    const priceLabel =
                      billingCycle === 'annual'
                        ? pPrice.formattedAnnualMonthly
                        : pPrice.formattedMonthly;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/80 shadow-xs ring-1 ring-sky-500'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">{p.name}</span>
                          {isSelected && <Check size={13} className="text-sky-600" />}
                        </div>
                        <div className="text-xs font-extrabold text-gray-800 mt-1">
                          {priceLabel}
                          <span className="text-[10px] text-gray-400 font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {p.maxSeats} Seats
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-sky-100/70">
                  <span className="flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    International VAT & Invoicing by Lemon Squeezy MoR
                  </span>
                  <span className="font-extrabold text-sm text-gray-900">
                    Total: {formattedPrice}
                  </span>
                </div>
              </div>

              {/* Gateway Status Banner */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTestMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-gray-800">
                      {isTestMode ? 'Lemon Squeezy Sandbox Simulator' : 'Lemon Squeezy Live Production'}
                    </span>
                    <span className="text-gray-500 block text-[11px]">
                      {isTestMode
                        ? 'Test mode active. Use quick test cards below to test instant tier upgrades.'
                        : `Connected to Store ID: ${storeId}`}
                    </span>
                  </div>
                </div>

                {onOpenConfig && (
                  <button
                    type="button"
                    onClick={onOpenConfig}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                  >
                    <Settings size={12} />
                    <span>Configure Keys</span>
                  </button>
                )}
              </div>

              {/* Realistic 3D Credit Card Preview */}
              <div className="relative rounded-2xl p-5 text-white shadow-xl overflow-hidden bg-gradient-to-tr from-slate-900 via-sky-950 to-indigo-950 border border-sky-800/40">
                {/* Background decorative circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* EMV Chip */}
                      <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 p-1 shadow-sm flex flex-col justify-between">
                        <div className="h-0.5 bg-amber-700/40 w-full" />
                        <div className="h-0.5 bg-amber-700/40 w-full" />
                      </div>
                      <span className="text-[10px] text-sky-200/80 font-mono tracking-widest uppercase">
                        Contactless
                      </span>
                    </div>

                    {/* Card Brand Badge */}
                    <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black tracking-widest uppercase">
                      {cardBrand === 'visa' && 'VISA'}
                      {cardBrand === 'mastercard' && 'MASTERCARD'}
                      {cardBrand === 'amex' && 'AMEX'}
                      {cardBrand === 'generic' && 'CARD'}
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="font-mono text-lg sm:text-xl font-bold tracking-wider text-sky-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  {/* Cardholder & Expiry */}
                  <div className="flex items-end justify-between text-xs">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-sky-300/80 font-semibold">
                        Cardholder Name
                      </div>
                      <div className="font-semibold text-white tracking-wide truncate max-w-[220px]">
                        {cardholderName || 'CLINIC OWNER'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-sky-300/80 font-semibold">
                        Expires
                      </div>
                      <div className="font-mono font-semibold text-white">
                        {expiry || 'MM/YY'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Fill Test Presets (Test Mode) */}
              {isTestMode && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" />
                      Quick Test Card Autofill (Sandbox):
                    </span>
                    <span className="text-[10px] text-amber-800">Click to fill</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('visa')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>💳 Visa (4242)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('mastercard')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>💳 Mastercard (5555)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('amex')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>💳 Amex (3782)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checkout Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="e.g. Dr. Muhammad Ali"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Billing Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@clinic.com"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242  4242  4242  4242"
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                    <CreditCard
                      size={16}
                      className="absolute left-3 top-2.5 text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={expiry}
                      onChange={handleExpiryChange}
                      placeholder="12/28"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Postal / ZIP
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="54000"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                {/* Processing Overlay/Notice */}
                {isProcessing && (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-3 animate-pulse">
                    <RefreshCw size={16} className="animate-spin text-sky-600 flex-shrink-0" />
                    <span className="font-bold">{processStep}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    }}
                  >
                    <Lock size={15} />
                    <span>
                      {isProcessing
                        ? 'Processing Payment...'
                        : `Pay ${formattedPrice} & Upgrade to ${currentPlanMeta.name}`}
                    </span>
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    Processed securely by Lemon Squeezy (Merchant of Record). Cancel anytime.
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
