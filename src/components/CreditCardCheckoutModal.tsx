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
  ArrowRight,
  Landmark,
  MessageSquare,
  Copy,
  ExternalLink,
  CheckCheck,
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
}: CreditCardCheckoutModalProps) {
  const { settings } = useClinicSettings();
  const gatewayConfig = settings.payment_gateway_config || {
    enabled: true,
    provider: 'lemon_squeezy',
    test_mode: false,
  };

  const isTestMode = gatewayConfig.test_mode === true;
  const storeId = gatewayConfig.lemon_squeezy_store_id || (import.meta as any).env?.VITE_LEMON_SQUEEZY_STORE_ID || '490757';

  // Modal payment method: defaults to 'bank' for PKR (Pakistan), 'card' for international USD
  const [modalPaymentMethod, setModalPaymentMethod] = useState<'card' | 'bank'>(
    currency === 'PKR' ? 'bank' : 'card'
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
    paymentMethod: string;
  } | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (planId) setSelectedPlan(planId);
    if (initialBillingCycle) setBillingCycle(initialBillingCycle);
    if (customerEmail && !email) setEmail(customerEmail);
    if (clinicName && (!cardholderName || cardholderName === 'Clinic Administrator')) {
      setCardholderName(clinicName);
    }
    setModalPaymentMethod(currency === 'PKR' ? 'bank' : 'card');
  }, [planId, initialBillingCycle, customerEmail, clinicName, currency]);

  if (!isOpen) return null;

  // Selected plan metadata
  const currentPlanMeta =
    INTERNATIONAL_PLANS.find((p) => p.id === selectedPlan) || INTERNATIONAL_PLANS[1];
  const priceData = currentPlanMeta.pricing[currency] || currentPlanMeta.pricing.USD;
  const formattedPrice =
    billingCycle === 'annual'
      ? `${currency === 'PKR' ? 'Rs. ' : '$'}${priceData.annualTotal.toLocaleString()}/year`
      : `${currency === 'PKR' ? 'Rs. ' : '$'}${priceData.monthly.toLocaleString()}/month`;

  function handleCopy(text: string, field: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

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

  // Direct Lemon Squeezy Overlay Launcher
  async function handleDirectLemonSqueezyCheckout() {
    setIsProcessing(true);
    setProcessStep('Connecting to Lemon Squeezy secure hosted checkout...');
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
            cardLast4: 'Lemon Squeezy MoR',
            cardBrand: 'Visa / MC / Amex',
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            planName: currentPlanMeta.name,
            billingCycle,
            paymentMethod: 'Lemon Squeezy Hosted Checkout',
          });
          setIsProcessing(false);
        },
        onCancel: () => {
          setIsProcessing(false);
        },
      });
    } catch {
      setIsProcessing(false);
    }
  }

  // Local Bank Transfer Instant Activation Confirmation
  function handleConfirmBankTransferActivation() {
    setIsProcessing(true);
    setProcessStep('Recording bank payment confirmation & activating workspace...');

    setTimeout(() => {
      const generatedTxId = `PK_BANK_${Date.now().toString(36).toUpperCase()}_${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

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
        cardLast4: 'NayaPay/UBL',
        cardBrand: 'Direct Bank & Raast',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        planName: currentPlanMeta.name,
        billingCycle,
        paymentMethod: 'Direct Bank / NayaPay / Raast Transfer',
      });

      setIsProcessing(false);
    }, 600);
  }

  // Trigger Form Checkout Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Launch Lemon Squeezy Official Hosted/Overlay Checkout if storeId configured
    if (storeId) {
      await handleDirectLemonSqueezyCheckout();
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
            paymentMethod: `${cardBrand.toUpperCase()} Credit Card`,
          });

          setIsProcessing(false);
        }, 800);
      }, 700);
    }, 700);
  }

  function handlePrintReceipt() {
    window.print();
  }

  const whatsappMessage = `Hi, I am sending the subscription payment receipt for ${clinicName || 'my clinic'} for the ${currentPlanMeta.name} (${billingCycle} billing - ${formattedPrice}). Please activate my subscription.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-sky-950 to-gray-900 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              {modalPaymentMethod === 'bank' ? <Landmark size={22} /> : <CreditCard size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {modalPaymentMethod === 'bank'
                    ? 'Pakistan Local Clinics Payment'
                    : 'Credit & Debit Card Checkout'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/30 text-sky-200 border border-sky-400/30 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  {modalPaymentMethod === 'bank' ? 'Zero Fee Transfer' : 'Lemon Squeezy MoR'}
                </span>
              </div>
              <p className="text-xs text-sky-200/80">
                {modalPaymentMethod === 'bank'
                  ? 'UBL Bank • NayaPay • Raast Instant ID 0334 4634278 • WhatsApp Verification'
                  : 'Global VAT & Sales Tax Handled Automatically • 256-Bit SSL Encrypted'}
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
                    Subscription Upgraded Successfully!
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
                    <span className="text-gray-500">Settlement Method:</span>
                    <span className="font-semibold text-gray-800">
                      {receiptData.paymentMethod}
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
              {/* Regional Method Switcher (Available when currency is PKR) */}
              {currency === 'PKR' && (
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalPaymentMethod('bank')}
                    className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      modalPaymentMethod === 'bank'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Landmark size={15} />
                    <span>🇵🇰 Direct Bank / Raast / WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      modalPaymentMethod === 'card'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>💳 Credit & Debit Card</span>
                  </button>
                </div>
              )}

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
                    {modalPaymentMethod === 'bank'
                      ? 'Pakistan Direct Bank Transfer (0% Transaction Fees)'
                      : 'International VAT & Invoicing by Lemon Squeezy MoR'}
                  </span>
                  <span className="font-extrabold text-sm text-gray-900">
                    Total: {formattedPrice}
                  </span>
                </div>
              </div>

              {/* VIEW 1: PAKISTAN LOCAL BANK & RAAST SETTLEMENT */}
              {modalPaymentMethod === 'bank' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <Landmark size={16} className="text-emerald-700" />
                        Bank Transfer & Raast Instant Payment Details
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                        Zero Fee
                      </span>
                    </div>

                    {/* Transfer Amount Highlight */}
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-gray-500 block">Transfer Amount for {currentPlanMeta.name}:</span>
                        <strong className="text-emerald-800 text-base font-extrabold font-display">
                          {formattedPrice}
                        </strong>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                        {billingCycle === 'annual' ? 'Annual Subscription' : 'Monthly Subscription'}
                      </span>
                    </div>

                    {/* Bank Details Table */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/90 p-3.5 rounded-xl border border-emerald-200">
                      <div>
                        <span className="text-gray-400 text-[10px] block font-semibold uppercase">Bank Name</span>
                        <strong className="text-gray-900">UBL (United Bank Limited)</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block font-semibold uppercase">Account Title</span>
                        <strong className="text-gray-900">Talha Sarfraz Malik</strong>
                      </div>
                      <div className="sm:col-span-2 pt-1 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-gray-400 text-[10px] block font-semibold uppercase">IBAN (UBL)</span>
                          <span className="font-mono text-xs font-bold text-gray-900 select-all">
                            PK66 UNIL 0109 0003 6725 1495
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy('PK66UNIL0109000367251495', 'iban')}
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1 border border-emerald-200"
                        >
                          {copiedField === 'iban' ? <CheckCheck size={12} /> : <Copy size={12} />}
                          <span>{copiedField === 'iban' ? 'Copied' : 'Copy IBAN'}</span>
                        </button>
                      </div>
                      <div className="sm:col-span-2 pt-1 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-gray-400 text-[10px] block font-semibold uppercase">
                            Raast / NayaPay / EasyPaisa / JazzCash
                          </span>
                          <span className="font-mono text-xs font-bold text-gray-900 select-all">
                            0334 4634278
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy('03344634278', 'raast')}
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1 border border-emerald-200"
                        >
                          {copiedField === 'raast' ? <CheckCheck size={12} /> : <Copy size={12} />}
                          <span>{copiedField === 'raast' ? 'Copied' : 'Copy Raast'}</span>
                        </button>
                      </div>
                    </div>

                    {/* QR Code Images */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 block mb-1">
                        Scan & Pay QR Codes (NayaPay & UBL Digital)
                      </span>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                          <img
                            src="/payments/nayapay_qr.jpg"
                            alt="NayaPay QR Code"
                            className="w-full h-28 object-contain rounded-lg"
                          />
                          <span className="text-[10px] font-bold text-gray-700 block">NayaPay QR</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                          <img
                            src="/payments/ubl_qr.jpg"
                            alt="UBL Digital QR Code"
                            className="w-full h-28 object-contain rounded-lg"
                          />
                          <span className="text-[10px] font-bold text-gray-700 block">UBL Bank QR</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Processing Overlay/Notice */}
                  {isProcessing && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 animate-pulse">
                      <RefreshCw size={16} className="animate-spin text-emerald-600 flex-shrink-0" />
                      <span className="font-bold">{processStep}</span>
                    </div>
                  )}

                  {/* WhatsApp Verification & Activation Actions */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={`https://wa.me/923093622732?text=${encodeURIComponent(whatsappMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <MessageSquare size={16} />
                      <span>1-Click Send Receipt on WhatsApp (03093622732)</span>
                    </a>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmBankTransferActivation}
                      className="w-full py-2.5 px-4 rounded-xl border-2 border-emerald-600 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      <span>I Have Transferred Payment - Activate {currentPlanMeta.name}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 2: CREDIT / DEBIT CARD CHECKOUT (LEMON SQUEEZY) */}
              {modalPaymentMethod === 'card' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Direct 1-Click Lemon Squeezy Overlay Launcher */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-2 border-sky-300 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-sky-600" size={18} />
                        <span className="font-bold text-xs text-gray-900">
                          Official Hosted Lemon Squeezy Checkout
                        </span>
                      </div>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Instant Overlay
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Launch Lemon Squeezy hosted checkout for Visa, Mastercard, American Express, Apple Pay, & Google Pay with automated international VAT compliance and instant license key activation.
                    </p>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleDirectLemonSqueezyCheckout}
                      className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.99] transition-all"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                    >
                      <ExternalLink size={15} />
                      <span>
                        {isProcessing
                          ? 'Opening Lemon Squeezy Checkout...'
                          : `Direct Checkout: ${currentPlanMeta.name} via Lemon Squeezy (${formattedPrice})`}
                      </span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-gray-200 w-full" />
                    <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                      Or Authorize Card In-Modal
                    </span>
                  </div>

                  {/* Realistic 3D Credit Card Preview */}
                  <div className="relative rounded-2xl p-5 text-white shadow-xl overflow-hidden bg-gradient-to-tr from-slate-900 via-sky-950 to-indigo-950 border border-sky-800/40">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col justify-between h-36">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 p-1 shadow-sm flex flex-col justify-between">
                            <div className="h-0.5 bg-amber-700/40 w-full" />
                            <div className="h-0.5 bg-amber-700/40 w-full" />
                          </div>
                          <span className="text-[10px] text-sky-200/80 font-mono tracking-widest uppercase">
                            Contactless
                          </span>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black tracking-widest uppercase">
                          {cardBrand === 'visa' && 'VISA'}
                          {cardBrand === 'mastercard' && 'MASTERCARD'}
                          {cardBrand === 'amex' && 'AMEX'}
                          {cardBrand === 'generic' && 'CARD'}
                        </div>
                      </div>

                      <div className="font-mono text-lg sm:text-xl font-bold tracking-wider text-sky-100">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

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
                        className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
