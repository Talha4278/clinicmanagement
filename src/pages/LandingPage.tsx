import { useState, useEffect } from 'react';
import {
  Stethoscope, Activity, Sparkles, ShieldCheck, CheckCircle2,
  Globe, Calendar, Pill, Package, FileText,
  ArrowRight, Star, Clock, TrendingUp,
  Layers, Lock, Laptop, Check, X,
  Building2, Play, Sliders, Zap,
  ChevronDown, MessageSquare, AlertCircle, Eye, EyeOff,
  Smartphone, Send, CheckCheck, RefreshCw, Receipt,
  CheckCircle, Database, PhoneCall, HeartPulse, UserCheck, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  INTERNATIONAL_PLANS,
  COMPETITOR_COMPARISON_DATA,
  TESTIMONIALS_DATA,
} from '../lib/internationalPricing';
import { ClinicSignUpData, SubscriptionPlan } from '../lib/types';
import { detectVisitorCurrency, saveManualCurrency, GeoDetectionResult } from '../lib/geoPricing';

// Tooth structure supporting both FDI (11–48 / 51–85) and Universal (1–32 / A–T)
interface OdontogramTooth {
  fdi: number;
  universal: string;
  name: string;
  arch: 'upper' | 'lower';
  quadrant: number;
  type: 'adult' | 'child';
  finding: 'healthy' | 'caries' | 'rct' | 'crown' | 'implant' | 'extracted';
  surfaces: string[];
}

const ADULT_TEETH_PRESET: OdontogramTooth[] = [
  // Upper Right (Quad 1) - FDI 18 down to 11 (Universal 1 to 8)
  { fdi: 18, universal: '1', name: 'Upper Right 3rd Molar (Wisdom)', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 17, universal: '2', name: 'Upper Right 2nd Molar', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 16, universal: '3', name: 'Upper Right 1st Molar', arch: 'upper', quadrant: 1, type: 'adult', finding: 'caries', surfaces: ['Occlusal', 'Distal'] },
  { fdi: 15, universal: '4', name: 'Upper Right 2nd Premolar', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Buccal'] },
  { fdi: 14, universal: '5', name: 'Upper Right 1st Premolar', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 13, universal: '6', name: 'Upper Right Canine', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 12, universal: '7', name: 'Upper Right Lateral Incisor', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 11, universal: '8', name: 'Upper Right Central Incisor', arch: 'upper', quadrant: 1, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },

  // Upper Left (Quad 2) - FDI 21 up to 28 (Universal 9 to 16)
  { fdi: 21, universal: '9', name: 'Upper Left Central Incisor', arch: 'upper', quadrant: 2, type: 'adult', finding: 'crown', surfaces: ['Buccal', 'Lingual'] },
  { fdi: 22, universal: '10', name: 'Upper Left Lateral Incisor', arch: 'upper', quadrant: 2, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 23, universal: '11', name: 'Upper Left Canine', arch: 'upper', quadrant: 2, type: 'adult', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 24, universal: '12', name: 'Upper Left 1st Premolar', arch: 'upper', quadrant: 2, type: 'adult', finding: 'caries', surfaces: ['Occlusal'] },
  { fdi: 25, universal: '13', name: 'Upper Left 2nd Premolar', arch: 'upper', quadrant: 2, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 26, universal: '14', name: 'Upper Left 1st Molar', arch: 'upper', quadrant: 2, type: 'adult', finding: 'rct', surfaces: ['Occlusal', 'Mesial'] },
  { fdi: 27, universal: '15', name: 'Upper Left 2nd Molar', arch: 'upper', quadrant: 2, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 28, universal: '16', name: 'Upper Left 3rd Molar (Wisdom)', arch: 'upper', quadrant: 2, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },

  // Lower Left (Quad 3) - FDI 38 down to 31 (Universal 17 to 24)
  { fdi: 38, universal: '17', name: 'Lower Left 3rd Molar (Wisdom)', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 37, universal: '18', name: 'Lower Left 2nd Molar', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 36, universal: '19', name: 'Lower Left 1st Molar', arch: 'lower', quadrant: 3, type: 'adult', finding: 'implant', surfaces: ['All'] },
  { fdi: 35, universal: '20', name: 'Lower Left 2nd Premolar', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 34, universal: '21', name: 'Lower Left 1st Premolar', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 33, universal: '22', name: 'Lower Left Canine', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 32, universal: '23', name: 'Lower Left Lateral Incisor', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 31, universal: '24', name: 'Lower Left Central Incisor', arch: 'lower', quadrant: 3, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },

  // Lower Right (Quad 4) - FDI 41 up to 48 (Universal 25 to 32)
  { fdi: 41, universal: '25', name: 'Lower Right Central Incisor', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 42, universal: '26', name: 'Lower Right Lateral Incisor', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 43, universal: '27', name: 'Lower Right Canine', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 44, universal: '28', name: 'Lower Right 1st Premolar', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 45, universal: '29', name: 'Lower Right 2nd Premolar', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 46, universal: '30', name: 'Lower Right 1st Molar', arch: 'lower', quadrant: 4, type: 'adult', finding: 'extracted', surfaces: ['All'] },
  { fdi: 47, universal: '31', name: 'Lower Right 2nd Molar', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 48, universal: '32', name: 'Lower Right 3rd Molar (Wisdom)', arch: 'lower', quadrant: 4, type: 'adult', finding: 'healthy', surfaces: ['Occlusal'] },
];

const CHILD_TEETH_PRESET: OdontogramTooth[] = [
  // Upper Right (Quad 5) - FDI 55 to 51 (Universal A to E)
  { fdi: 55, universal: 'A', name: 'Pediatric Upper Right 2nd Molar', arch: 'upper', quadrant: 5, type: 'child', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 54, universal: 'B', name: 'Pediatric Upper Right 1st Molar', arch: 'upper', quadrant: 5, type: 'child', finding: 'caries', surfaces: ['Occlusal'] },
  { fdi: 53, universal: 'C', name: 'Pediatric Upper Right Canine', arch: 'upper', quadrant: 5, type: 'child', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 52, universal: 'D', name: 'Pediatric Upper Right Lateral Incisor', arch: 'upper', quadrant: 5, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 51, universal: 'E', name: 'Pediatric Upper Right Central Incisor', arch: 'upper', quadrant: 5, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },

  // Upper Left (Quad 6) - FDI 61 to 65 (Universal F to J)
  { fdi: 61, universal: 'F', name: 'Pediatric Upper Left Central Incisor', arch: 'upper', quadrant: 6, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 62, universal: 'G', name: 'Pediatric Upper Left Lateral Incisor', arch: 'upper', quadrant: 6, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 63, universal: 'H', name: 'Pediatric Upper Left Canine', arch: 'upper', quadrant: 6, type: 'child', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 64, universal: 'I', name: 'Pediatric Upper Left 1st Molar', arch: 'upper', quadrant: 6, type: 'child', finding: 'caries', surfaces: ['Occlusal', 'Distal'] },
  { fdi: 65, universal: 'J', name: 'Pediatric Upper Left 2nd Molar', arch: 'upper', quadrant: 6, type: 'child', finding: 'healthy', surfaces: ['Occlusal'] },

  // Lower Left (Quad 7) - FDI 75 to 71 (Universal K to O)
  { fdi: 75, universal: 'K', name: 'Pediatric Lower Left 2nd Molar', arch: 'lower', quadrant: 7, type: 'child', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 74, universal: 'L', name: 'Pediatric Lower Left 1st Molar', arch: 'lower', quadrant: 7, type: 'child', finding: 'crown', surfaces: ['Occlusal', 'Buccal'] },
  { fdi: 73, universal: 'M', name: 'Pediatric Lower Left Canine', arch: 'lower', quadrant: 7, type: 'child', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 72, universal: 'N', name: 'Pediatric Lower Left Lateral Incisor', arch: 'lower', quadrant: 7, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 71, universal: 'O', name: 'Pediatric Lower Left Central Incisor', arch: 'lower', quadrant: 7, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },

  // Lower Right (Quad 8) - FDI 81 to 85 (Universal P to T)
  { fdi: 81, universal: 'P', name: 'Pediatric Lower Right Central Incisor', arch: 'lower', quadrant: 8, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 82, universal: 'Q', name: 'Pediatric Lower Right Lateral Incisor', arch: 'lower', quadrant: 8, type: 'child', finding: 'healthy', surfaces: ['Incisal'] },
  { fdi: 83, universal: 'R', name: 'Pediatric Lower Right Canine', arch: 'lower', quadrant: 8, type: 'child', finding: 'healthy', surfaces: ['Labial'] },
  { fdi: 84, universal: 'S', name: 'Pediatric Lower Right 1st Molar', arch: 'lower', quadrant: 8, type: 'child', finding: 'healthy', surfaces: ['Occlusal'] },
  { fdi: 85, universal: 'T', name: 'Pediatric Lower Right 2nd Molar', arch: 'lower', quadrant: 8, type: 'child', finding: 'healthy', surfaces: ['Occlusal'] },
];

export default function LandingPage() {
  const { signIn, registerClinic, signInAsDemo } = useAuth();

  // Currency & Billing State (USD, PKR, AED, SAR prominent)
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [geoInfo, setGeoInfo] = useState<GeoDetectionResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    detectVisitorCurrency().then((res) => {
      if (isMounted) {
        setGeoInfo(res);
        setCurrency(res.currency);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectCurrency = (code: CurrencyCode) => {
    setCurrency(code);
    saveManualCurrency(code);
    if (geoInfo) {
      setGeoInfo({ ...geoInfo, currency: code, source: 'manual' });
    }
  };

  // Interactive Odontogram State: Dual Notation (FDI vs Universal) + Arch
  const [notationSystem, setNotationSystem] = useState<'fdi' | 'universal'>('fdi');
  const [dentitionMode, setDentitionMode] = useState<'adult' | 'child'>('adult');
  const [activeTeeth, setActiveTeeth] = useState<OdontogramTooth[]>([...ADULT_TEETH_PRESET, ...CHILD_TEETH_PRESET]);
  const [selectedToothKey, setSelectedToothKey] = useState<number>(16); // default to FDI 16

  // WhatsApp Workflow Interactive Simulation State
  const [activeWhatsAppTab, setActiveWhatsAppTab] = useState<'reminder' | 'rx' | 'invoice'>('reminder');
  const [isChairConfirmed, setIsChairConfirmed] = useState<boolean>(false);
  const [showRxModal, setShowRxModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  // ROI Calculator State
  const [chairsCount, setChairsCount] = useState<number>(3);
  const [patientsPerDay, setPatientsPerDay] = useState<number>(14);
  const [avgTicketBaseUSD, setAvgTicketBaseUSD] = useState<number>(120);

  // FAQ Open State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signup');
  const [selectedPlanForSignup, setSelectedPlanForSignup] = useState<SubscriptionPlan>('pro');

  // Auth Form Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Sign Up Form Inputs
  const [signupForm, setSignupForm] = useState<ClinicSignUpData>({
    clinic_name: '',
    tagline: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    plan: 'pro',
  });

  const currConfig = SUPPORTED_CURRENCIES[currency];

  // Currency multiplier relative to base USD
  const currencyMultiplier =
    currency === 'USD' ? 1
    : currency === 'AED' ? 3.67
    : currency === 'SAR' ? 3.75
    : currency === 'GBP' ? 0.79
    : currency === 'EUR' ? 0.92
    : currency === 'CAD' ? 1.36
    : currency === 'AUD' ? 1.52
    : 280; // PKR

  // Tooth finding costs
  const getFindingCost = (finding: OdontogramTooth['finding']): number => {
    let baseUSD = 0;
    if (finding === 'caries') baseUSD = 150;
    else if (finding === 'rct') baseUSD = 700;
    else if (finding === 'crown') baseUSD = 850;
    else if (finding === 'implant') baseUSD = 1800;
    else if (finding === 'extracted') baseUSD = 180;
    return Math.round(baseUSD * currencyMultiplier);
  };

  // Helper to open signup modal with specific plan
  const handleOpenSignup = (plan: SubscriptionPlan = 'pro') => {
    setSelectedPlanForSignup(plan);
    setSignupForm((prev) => ({ ...prev, plan }));
    setAuthTab('signup');
    setAuthError('');
    setShowAuthModal(true);
  };

  const handleOpenSignIn = () => {
    setAuthTab('signin');
    setAuthError('');
    setShowAuthModal(true);
  };

  // Sign In submit handler
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const res = await signIn(loginEmail, loginPassword, true);
    if (res.error) {
      setAuthError(res.error);
    } else {
      setShowAuthModal(false);
    }
    setAuthLoading(false);
  };

  // Sign Up submit handler
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!signupForm.clinic_name.trim()) {
      setAuthError('Please enter your clinic name');
      return;
    }
    if (!signupForm.owner_name.trim()) {
      setAuthError('Please enter the clinic owner / doctor name');
      return;
    }
    if (signupForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    setAuthLoading(true);
    const res = await registerClinic(signupForm);
    if (res.error) {
      setAuthError(res.error);
    } else {
      setShowAuthModal(false);
    }
    setAuthLoading(false);
  };

  // Interactive tooth finding update
  const updateToothFinding = (finding: OdontogramTooth['finding']) => {
    setActiveTeeth((prev) =>
      prev.map((t) => (t.fdi === selectedToothKey ? { ...t, finding } : t))
    );
  };

  // Filter current arch teeth
  const currentArchTeeth = activeTeeth.filter((t) => t.type === dentitionMode);
  const selectedToothObj =
    activeTeeth.find((t) => t.fdi === selectedToothKey) || currentArchTeeth[0] || activeTeeth[0];

  // Total active demo procedure tally
  const totalChartEstimate = currentArchTeeth.reduce(
    (sum, t) => sum + getFindingCost(t.finding),
    0
  );

  // ROI Calculator Calculations
  const avgTicket = Math.round(avgTicketBaseUSD * currencyMultiplier);
  const monthlyPatients = chairsCount * patientsPerDay * 24;
  const monthlyRecoveredGap = Math.round(monthlyPatients * 0.06 * avgTicket * 0.35);
  const staffHoursSaved = chairsCount * 18;
  const followUpCapture = Math.round(chairsCount * 3.5 * avgTicket * 0.85);
  const totalMonthlyGain = monthlyRecoveredGap + followUpCapture;
  const netAnnualGain = totalMonthlyGain * 12;

  // Selected plan annual cost for ROI comparison
  const proPlan = INTERNATIONAL_PLANS.find((p) => p.id === 'pro')!;
  const annualSoftwareCost = proPlan.pricing[currency].annualTotal;
  const roiMultiplier = Math.max(12, Math.round(netAnnualGain / (annualSoftwareCost || 1)));

  // FAQ Items tailored to international clinical operations
  const faqList = [
    {
      q: 'How does Clinsyst support both FDI Two-Digit (11–48) and Universal (1–32) notation?',
      a: 'Clinsyst is engineered from the ground up for international practice flexibility. Clinics in the UAE, GCC, UK, Europe, and Southeast Asia use the FDI World Dental Federation notation (11–48 for adult arches, 51–85 for pediatric arches), while American practices use Universal numbering (1–32 / A–T). With a single click in your settings or right on the operatory screen, you can toggle between both systems. All exported treatment plans, invoices, and digital prescriptions adapt instantly to your selected notation.',
    },
    {
      q: 'Can patient data and charts be migrated free of charge from Excel or legacy EMRs?',
      a: 'Yes, 100% free with zero downtime. We offer an automated self-serve Excel/CSV import tool for patient lists, phone numbers, and past balances. Furthermore, our dedicated VIP Migration Concierge team will securely migrate your clinical histories, odontograms, and treatment records from legacy systems (such as Open Dental, Curve Dental, Dentrix, CareStack, Practo, or local desktop databases) at no extra cost.',
    },
    {
      q: 'How does the automated WhatsApp workflow reduce patient no-shows?',
      a: 'Traditional SMS messages and emails suffer from low response rates (under 20%). Clinsyst integrates official WhatsApp Business Cloud messaging to automatically dispatch polite, localized 24-hour appointment reminders. Patients tap an interactive 1-click confirmation button directly inside WhatsApp. When clicked, your clinic schedule instantly updates in real time, locking the chair and notifying your reception desk without a single telephone call.',
    },
    {
      q: 'Do we need local clinic servers, specialized dental hardware, or IT technicians?',
      a: 'None at all. Clinsyst is a modern, 100% cloud-native Dental Operating System. It runs fluidly in any modern web browser on Mac, Windows PC, iPads, Android tablets, and operatory chair-side touchscreens. Backups, database indexing, and software updates happen automatically in the background with AES-256 bit encryption and strict multi-tenant isolation.',
    },
    {
      q: 'Can multiple doctors, receptionists, and nurses work simultaneously across chairs?',
      a: 'Absolutely. Clinsyst is built specifically for concurrent multi-chair workflows. While receptionists check in patients and collect split payments at the front desk, doctors and associates simultaneously chart odontograms and generate electronic prescriptions in operatories with role-based security permissions.',
    },
    {
      q: 'What happens during and after the 14-day free trial?',
      a: 'You receive full, unrestricted access to all features—including adult and pediatric odontograms, WhatsApp automation, inventory expiry alerts, and invoicing. No credit card is required to sign up. At the end of 14 days, you can choose Starter, Pro, or Network billing. All your registered patients, clinical notes, and custom templates remain completely intact.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-500 selection:text-white font-sans antialiased">
      {/* ── 1. ANNOUNCEMENT BAR: GLOBAL EDITION / FDI NOTATION NOTICE ─────── */}
      <div className="bg-gradient-to-r from-slate-950 via-sky-950 to-indigo-950 text-white text-xs py-2.5 px-4 border-b border-sky-800/40 relative z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-center sm:text-left flex-wrap">
            <span className="bg-sky-500/20 text-sky-300 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-sky-400/30 flex items-center gap-1">
              <Zap size={11} className="text-amber-300 fill-amber-300" /> Global Edition Live
            </span>
            <span className="text-slate-200 text-[11px] sm:text-xs">
              Dual <strong className="text-white">FDI (11–48)</strong> & <strong className="text-white">Universal (1–32)</strong> notation ready. Localized for GCC (USD, AED, SAR) & International Clinics.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Quick Currency Selector in Banner */}
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 text-[11px]">
              <Globe size={12} className="text-sky-300" />
              <button
                onClick={() => handleSelectCurrency('USD')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  currency === 'USD' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => handleSelectCurrency('PKR')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  currency === 'PKR' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                PKR (Rs)
              </button>
              <button
                onClick={() => handleSelectCurrency('AED')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  currency === 'AED' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                AED
              </button>
              <button
                onClick={() => handleSelectCurrency('SAR')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  currency === 'SAR' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                SAR
              </button>
              <select
                value={currency}
                onChange={(e) => handleSelectCurrency(e.target.value as CurrencyCode)}
                className="bg-transparent text-slate-300 hover:text-white font-semibold outline-none cursor-pointer text-[10px] pl-1 border-l border-white/20"
                aria-label="More Currencies"
              >
                <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
                <option value="PKR" className="bg-slate-900 text-white">PKR (Rs.)</option>
                <option value="AED" className="bg-slate-900 text-white">AED (د.إ)</option>
                <option value="SAR" className="bg-slate-900 text-white">SAR (﷼)</option>
                <option value="GBP" className="bg-slate-900 text-white">GBP (£)</option>
                <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
                <option value="CAD" className="bg-slate-900 text-white">CAD (CA$)</option>
                <option value="AUD" className="bg-slate-900 text-white">AUD (A$)</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenSignup('pro')}
              className="text-amber-300 hover:text-amber-200 font-bold inline-flex items-center gap-1 transition-colors text-[11px] bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20"
            >
              Get 2 Months Free <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. HEADER & NAV: FEATURES, ODONTOGRAM, CURRENCY (USD/AED/SAR) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-md shadow-sky-600/25 font-bold text-xl font-sans border border-sky-400/30">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-2xl tracking-tight text-slate-900">
                  Clinsyst
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Dental OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Practice Intelligence Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-sky-600 transition-colors">
              Features
            </a>
            <a href="#odontogram-demo" className="hover:text-sky-600 transition-colors flex items-center gap-1.5 font-semibold text-slate-800">
              <Stethoscope size={15} className="text-sky-600" />
              Dual Odontogram
            </a>
            <a href="#whatsapp-workflow" className="hover:text-sky-600 transition-colors flex items-center gap-1.5 font-semibold text-emerald-700">
              <MessageSquare size={15} className="text-emerald-600" />
              WhatsApp Engine
            </a>
            <a href="#platform-grid" className="hover:text-sky-600 transition-colors">
              Platform
            </a>
            <a href="#pricing" className="hover:text-sky-600 transition-colors font-semibold text-slate-900">
              Global Pricing
            </a>
            <a href="#reviews" className="hover:text-sky-600 transition-colors">
              Reviews
            </a>
            <a href="#faq" className="hover:text-sky-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Header Action CTAs & Currency Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Currency Pill Switcher (USD, PKR, AED, SAR) */}
            <div className="hidden lg:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => handleSelectCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="US Dollar"
              >
                🇺🇸 USD ($)
              </button>
              <button
                onClick={() => handleSelectCurrency('PKR')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'PKR'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Pakistani Rupee"
              >
                🇵🇰 PKR (Rs)
              </button>
              <button
                onClick={() => handleSelectCurrency('AED')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'AED'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="UAE Dirham"
              >
                🇦🇪 AED
              </button>
              <button
                onClick={() => handleSelectCurrency('SAR')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'SAR'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Saudi Riyal"
              >
                🇸🇦 SAR
              </button>
            </div>

            {/* Quick Demo Instant Login */}
            <button
              onClick={() => signInAsDemo('doctor')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-sky-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200"
              title="Instantly opens full clinic with pre-loaded demo patients and charts"
            >
              <Play size={12} className="text-sky-600 fill-sky-600" />
              <span>Demo</span>
            </button>

            {/* Sign In */}
            <button
              onClick={handleOpenSignIn}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-2 transition-colors"
            >
              Sign In
            </button>

            {/* Start Free Trial Button */}
            <button
              onClick={() => handleOpenSignup('pro')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl shadow-md shadow-sky-600/25 hover:shadow-lg hover:shadow-sky-600/35 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION: VALUE PROP + LIVE CLINICAL MOCKUP PREVIEW ───── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 bg-gradient-to-b from-slate-50 via-sky-50/30 to-white">
        {/* Glow ambient decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sky-200/40 via-cyan-100/20 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header pill & Social Proof badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-medium text-slate-700">
              <span className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} fill="currentColor" />
                ))}
              </span>
              <span className="font-semibold text-slate-900">4.9/5</span>
              <span className="text-slate-400">•</span>
              <span>Trusted by 450+ Dental Surgeries Worldwide (UAE, UK, US, South Asia)</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Zero Setup Fees • HIPAA & GDPR Ready</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.12]">
              The High-Performance Dental OS That <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Doubles Chair Efficiency
              </span>{' '}
              & Ends Billing Leakage.
            </h1>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Ditch $400+/mo legacy US software and paper charting. Clinsyst unifies interactive dual FDI & Universal odontograms, automated 1-click WhatsApp reminders, inventory expiry sentinel, and instant operatory billing into one cloud workspace.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
            <button
              onClick={() => handleOpenSignup('pro')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-sky-600/30 hover:shadow-xl hover:shadow-sky-600/40 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => signInAsDemo('doctor')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 transition-all"
            >
              <Play size={15} className="text-sky-600 fill-sky-600" />
              <span>Launch Live Interactive Clinic Demo</span>
            </button>
          </div>

          {/* Micro Trust Seals */}
          <div className="flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs text-slate-500 font-medium pb-8 border-b border-slate-200/70 max-w-3xl mx-auto">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-600" /> 14-Day Free Trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-600" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-600" /> 5-Minute Instant Cloud Setup
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-sky-600" /> Free White-Glove Patient Migration from Excel
            </span>
          </div>

          {/* ── LIVE CLINICAL MOCKUP PREVIEW ───────────────────────────────── */}
          <div className="mt-10 relative max-w-5xl mx-auto">
            <div className="rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-slate-200/80 via-slate-100/60 to-slate-200/40 shadow-2xl border border-slate-300/80 backdrop-blur-sm">
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                {/* Simulated App Header */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="h-4 w-px bg-slate-700" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-sky-300">Apex Dental Studio & Implant Center</span>
                      <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800">
                        Live Operatory 1 • Restorative
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="hidden sm:inline">Dr. Sarah Tariq (Surgeon)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                {/* Simulated Operatory Chair Status Bar */}
                <div className="bg-slate-800/90 text-slate-200 px-4 py-2 flex items-center justify-between text-[11px] border-b border-slate-700">
                  <div className="flex items-center gap-4 overflow-x-auto">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <strong>Chair 1:</strong> In Treatment (Composite #16)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <strong>Chair 2:</strong> Confirmed via WhatsApp (03:00 PM)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <strong>Chair 3:</strong> Sterilizing
                    </span>
                  </div>
                  <span className="text-emerald-400 font-bold hidden md:inline">
                    Synced with WhatsApp Cloud
                  </span>
                </div>

                {/* Simulated Dashboard Grid */}
                <div className="p-4 sm:p-6 bg-slate-50/70">
                  {/* Real-time KPI Stats Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {currConfig.symbol}{Math.round(2840 * currencyMultiplier).toLocaleString()}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        ↑ +24% vs last week
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chair Utilization</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">91.4%</p>
                      <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        Zero operatory dead-time
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Patients Charted</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">16 Today</p>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        Avg: 42s per odontogram
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Expiry Sentinel</p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">100% Guarded</p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        0 expired resins / anesthetics
                      </span>
                    </div>
                  </div>

                  {/* Split Preview: Chart preview + Patient Snapshot */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Odontogram Mini View */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Stethoscope size={16} className="text-sky-600" />
                          <h4 className="text-xs font-bold text-slate-800">
                            Odontogram Charting • FDI (11–48) & Universal (1–32)
                          </h4>
                        </div>
                        <span className="text-[11px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          Dual Notation
                        </span>
                      </div>

                      {/* Mini Tooth Representation preview */}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2 px-1 font-semibold">
                          <span>Maxillary (Upper Arch)</span>
                          <span className="text-emerald-700">● Sound (26) ● Caries (3) ● Restored (3)</span>
                        </div>

                        {/* Interactive miniature row */}
                        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 text-center">
                          {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((num) => {
                            const isDecayed = num === 16 || num === 24;
                            const isCrown = num === 21;
                            const isRct = num === 26;
                            return (
                              <div
                                key={num}
                                className={`p-1.5 rounded text-[11px] font-bold border transition-all ${
                                  isDecayed
                                    ? 'bg-rose-100 border-rose-400 text-rose-800'
                                    : isCrown
                                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                                    : isRct
                                    ? 'bg-purple-100 border-purple-400 text-purple-800'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-sky-400'
                                }`}
                              >
                                <div className="text-[9px] text-slate-400 leading-none">{num}</div>
                                <div className="mt-0.5 text-xs font-extrabold">
                                  {isDecayed ? 'C' : isCrown ? 'Cr' : isRct ? 'RCT' : '•'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Caries
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Crown
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" /> RCT
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Sound
                          </span>
                        </div>
                        <a
                          href="#odontogram-demo"
                          className="text-sky-600 hover:text-sky-700 font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          Explore Interactive Engine <ArrowRight size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Patient Dossier Snapshot */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Activity size={16} className="text-emerald-600" />
                            <h4 className="text-xs font-bold text-slate-800">360° Patient Dossier</h4>
                          </div>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCheck size={11} /> WhatsApp Confirmed
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between pb-1.5 border-b border-slate-100">
                            <span className="text-slate-500">Patient:</span>
                            <span className="font-semibold text-slate-900">Fatima Al-Zahra (32y)</span>
                          </div>
                          <div className="flex justify-between pb-1.5 border-b border-slate-100">
                            <span className="text-slate-500">Chief Complaint:</span>
                            <span className="font-semibold text-slate-900">Sensitivity tooth #16 (FDI)</span>
                          </div>
                          <div className="flex justify-between pb-1.5 border-b border-slate-100">
                            <span className="text-slate-500">Scheduled Rx:</span>
                            <span className="font-semibold text-slate-900">Amoxicillin 500mg, Ibuprofen</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Generated Invoice:</span>
                            <span className="font-bold text-emerald-600">
                              {currConfig.symbol}{Math.round(450 * currencyMultiplier).toLocaleString()} (Paid)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => signInAsDemo('doctor')}
                        className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play size={11} className="fill-white" />
                        Explore Live Clinic Workflow
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. METRICS BANNER: 5-MIN SETUP, -40% NO-SHOWS, 1/5TH COST ──────── */}
      <section className="bg-slate-900 text-white py-8 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div className="p-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 mb-2">
                <Zap size={18} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-display text-white">5-Min</p>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mt-1">Instant Cloud Setup</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero IT servers required</p>
            </div>

            <div className="p-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 mb-2">
                <MessageSquare size={18} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-400">-40%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mt-1">Patient No-Shows</p>
              <p className="text-[11px] text-slate-400 mt-0.5">1-click WhatsApp sync</p>
            </div>

            <div className="p-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 mb-2">
                <TrendingUp size={18} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-display text-amber-400">1/5th</p>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mt-1">The Cost of Legacy</p>
              <p className="text-[11px] text-slate-400 mt-0.5">From $24/mo vs $400+/mo</p>
            </div>

            <div className="p-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 mb-2">
                <Clock size={18} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-display text-cyan-400">&lt; 45s</p>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300 mt-1">Tooth Charting Speed</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Surface-level auto tally</p>
            </div>

            <div className="col-span-2 md:col-span-1 p-3">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 mb-2">
                <ShieldCheck size={18} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-display text-indigo-300">99.4%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 mt-1">Billing Collection</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Split payments & audit trail</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURE 1: INTERACTIVE ADULT (32) & PEDIATRIC (20) CHART ────── */}
      <section id="odontogram-demo" className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs uppercase font-bold tracking-widest text-sky-400 bg-sky-950/80 px-3 py-1 rounded-full border border-sky-800/80">
              Dual Notation Odontogram Spotlight
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-4 tracking-tight">
              Interactive 32-Adult & 20-Pediatric Tooth Charting
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Western software locks clinics into Universal numbering, creating friction for UAE, GCC, UK, and Southeast Asian practices that use FDI two-digit notation. Clinsyst natively bridges both with 1-click toggling across adult and pediatric arches.
            </p>
          </div>

          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl max-w-6xl mx-auto backdrop-blur-md">
            {/* Control Bar: Arch Switcher + Notation Switcher + Live Tally */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
              {/* Dentition Selector */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => {
                    setDentitionMode('adult');
                    setSelectedToothKey(16);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    dentitionMode === 'adult'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Adult Permanent Arch (32)
                </button>
                <button
                  onClick={() => {
                    setDentitionMode('child');
                    setSelectedToothKey(54);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    dentitionMode === 'child'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pediatric Deciduous Arch (20)
                </button>
              </div>

              {/* Notation Switcher (FDI vs Universal) */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 px-2 font-semibold">Notation:</span>
                <button
                  onClick={() => setNotationSystem('fdi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    notationSystem === 'fdi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>FDI (11–48 / 51–85)</span>
                  <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.2 rounded text-emerald-200">GCC & Global</span>
                </button>
                <button
                  onClick={() => setNotationSystem('universal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    notationSystem === 'universal'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Universal (1–32 / A–T)</span>
                  <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.2 rounded text-emerald-200">US Standard</span>
                </button>
              </div>

              {/* Estimated Treatment Total Box */}
              <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Estimated Treatment Total:</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {currConfig.symbol}{totalChartEstimate.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Visual Arch Representation */}
            <div className="space-y-4 mb-6">
              {/* Maxillary (Upper) Arch */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                  <span>Upper Maxillary Arch</span>
                  <span className="text-sky-400 text-[11px] normal-case font-medium">
                    Showing {notationSystem === 'fdi' ? 'FDI numbers' : 'Universal numbers'}
                  </span>
                </div>

                <div className={`grid ${dentitionMode === 'adult' ? 'grid-cols-8 sm:grid-cols-16' : 'grid-cols-5 sm:grid-cols-10'} gap-1.5`}>
                  {currentArchTeeth
                    .filter((t) => t.arch === 'upper')
                    .map((t) => {
                      const isSelected = t.fdi === selectedToothKey;
                      const displayNum = notationSystem === 'fdi' ? t.fdi : `#${t.universal}`;
                      const altNum = notationSystem === 'fdi' ? `#${t.universal}` : `FDI ${t.fdi}`;

                      const colorClasses =
                        t.finding === 'caries'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                          : t.finding === 'rct'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                          : t.finding === 'crown'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                          : t.finding === 'implant'
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                          : t.finding === 'extracted'
                          ? 'bg-slate-800/80 border-slate-600 text-slate-400'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                      return (
                        <button
                          key={t.fdi}
                          onClick={() => setSelectedToothKey(t.fdi)}
                          className={`p-2 rounded-xl border text-center transition-all relative ${colorClasses} ${
                            isSelected ? 'ring-2 ring-sky-400 scale-105 z-10' : ''
                          }`}
                        >
                          <div className="text-xs font-extrabold">{displayNum}</div>
                          <div className="text-[9px] text-slate-400 font-normal">{altNum}</div>
                          <div className="text-[10px] font-bold mt-1 capitalize truncate">
                            {t.finding === 'healthy' ? 'Sound' : t.finding}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Mandibular (Lower) Arch */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                  <span>Lower Mandibular Arch</span>
                  <span className="text-sky-400 text-[11px] normal-case font-medium">Click any tooth to apply diagnosis</span>
                </div>

                <div className={`grid ${dentitionMode === 'adult' ? 'grid-cols-8 sm:grid-cols-16' : 'grid-cols-5 sm:grid-cols-10'} gap-1.5`}>
                  {currentArchTeeth
                    .filter((t) => t.arch === 'lower')
                    .map((t) => {
                      const isSelected = t.fdi === selectedToothKey;
                      const displayNum = notationSystem === 'fdi' ? t.fdi : `#${t.universal}`;
                      const altNum = notationSystem === 'fdi' ? `#${t.universal}` : `FDI ${t.fdi}`;

                      const colorClasses =
                        t.finding === 'caries'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                          : t.finding === 'rct'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                          : t.finding === 'crown'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                          : t.finding === 'implant'
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                          : t.finding === 'extracted'
                          ? 'bg-slate-800/80 border-slate-600 text-slate-400'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                      return (
                        <button
                          key={t.fdi}
                          onClick={() => setSelectedToothKey(t.fdi)}
                          className={`p-2 rounded-xl border text-center transition-all relative ${colorClasses} ${
                            isSelected ? 'ring-2 ring-sky-400 scale-105 z-10' : ''
                          }`}
                        >
                          <div className="text-xs font-extrabold">{displayNum}</div>
                          <div className="text-[9px] text-slate-400 font-normal">{altNum}</div>
                          <div className="text-[10px] font-bold mt-1 capitalize truncate">
                            {t.finding === 'healthy' ? 'Sound' : t.finding}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Selected Tooth Detail & Diagnostic Actions */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-sky-400">Tooth FDI {selectedToothObj.fdi}</span>
                    <span className="text-slate-400 text-sm font-normal">
                      (Universal #{selectedToothObj.universal}) • {selectedToothObj.name}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Surfaces Affected:{' '}
                    <strong className="text-slate-200">{selectedToothObj.surfaces.join(', ')}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Procedure Estimated Cost:</span>
                  <span className="text-base font-bold text-emerald-400">
                    {getFindingCost(selectedToothObj.finding) > 0
                      ? `${currConfig.symbol}${getFindingCost(selectedToothObj.finding).toLocaleString()}`
                      : 'No Fee (Sound)'}
                  </span>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Apply Clinical Finding / Diagnosis to Selected Tooth:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <button
                  onClick={() => updateToothFinding('healthy')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'healthy'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                      : 'bg-slate-900 text-emerald-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Sound / Healthy
                </button>

                <button
                  onClick={() => updateToothFinding('caries')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'caries'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40'
                      : 'bg-slate-900 text-rose-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Caries / Decay
                </button>

                <button
                  onClick={() => updateToothFinding('rct')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'rct'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                      : 'bg-slate-900 text-purple-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Root Canal (RCT)
                </button>

                <button
                  onClick={() => updateToothFinding('crown')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'crown'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/40'
                      : 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Crown / Bridge
                </button>

                <button
                  onClick={() => updateToothFinding('implant')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'implant'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/40'
                      : 'bg-slate-900 text-cyan-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Dental Implant
                </button>

                <button
                  onClick={() => updateToothFinding('extracted')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    selectedToothObj.finding === 'extracted'
                      ? 'bg-slate-700 text-white border-slate-600 shadow-md shadow-slate-900/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Extracted
                </button>
              </div>

              {/* Conversion Callout in Odontogram */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Surface-precision diagnosis automatically generates itemized invoices and digital Rx slips.
                </span>
                <button
                  onClick={() => handleOpenSignup('pro')}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Launch Live Charting in 14-Day Free Trial</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FEATURE 2: AUTOMATED WHATSAPP WORKFLOW (SPLIT-SCREEN DEMO) ── */}
      <section id="whatsapp-workflow" className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/80 px-3.5 py-1 rounded-full border border-emerald-700/60 flex items-center justify-center gap-1.5 w-max mx-auto mb-3">
              <MessageSquare size={13} className="text-emerald-400" />
              WhatsApp-First Patient Communication
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Halve Patient No-Shows with Automated WhatsApp Chair Synchronization
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Private international practices lose up to 35% of clinic capacity to missed appointments. While SMS and emails are ignored, WhatsApp boasts a 98% open rate. Clinsyst automates 24-hr reminders with 1-click patient confirmation buttons that automatically update chair status in your schedule.
            </p>

            {/* Workflow Switcher Tabs */}
            <div className="mt-8 inline-flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700">
              <button
                onClick={() => setActiveWhatsAppTab('reminder')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeWhatsAppTab === 'reminder'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar size={13} />
                <span>1. 24-Hr Chair Confirmation</span>
              </button>
              <button
                onClick={() => setActiveWhatsAppTab('rx')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeWhatsAppTab === 'rx'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Pill size={13} />
                <span>2. Digital Rx Slips</span>
              </button>
              <button
                onClick={() => setActiveWhatsAppTab('invoice')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeWhatsAppTab === 'invoice'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt size={13} />
                <span>3. Invoice & Payment Links</span>
              </button>
            </div>
          </div>

          {/* Split-Screen Interactive Demo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            {/* LEFT COLUMN: Simulated Patient WhatsApp Phone Mockup */}
            <div className="lg:col-span-5">
              <div className="max-w-sm mx-auto bg-slate-800 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700">
                {/* Phone Speaker & Notch */}
                <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2" />

                {/* WhatsApp App Screen */}
                <div className="bg-[#0b141a] rounded-[28px] overflow-hidden border border-slate-800 text-slate-100 flex flex-col h-[520px]">
                  {/* WhatsApp Header */}
                  <div className="bg-[#1f2c34] p-3 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                        AD
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h5 className="text-xs font-bold text-white">Apex Dental Studio</h5>
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-extrabold" title="Verified Business">
                            ✓
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-400">Business Account • Online</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <PhoneCall size={14} />
                    </div>
                  </div>

                  {/* Chat Wallpaper & Messages Body */}
                  <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                    <div className="text-center my-1">
                      <span className="bg-[#182229] text-[10px] text-slate-400 px-2.5 py-0.5 rounded-full shadow-xs">
                        TODAY
                      </span>
                    </div>

                    {/* WhatsApp Message 1: Dynamic per Tab */}
                    {activeWhatsAppTab === 'reminder' && (
                      <div className="bg-[#1f2c34] rounded-2xl rounded-tl-none p-3.5 max-w-[92%] shadow-md border border-slate-800/80 text-xs">
                        <p className="text-[11px] font-semibold text-emerald-400 mb-1">
                          Apex Dental Care • Operatory Notification
                        </p>
                        <p className="text-slate-200 leading-relaxed text-[11px]">
                          Assalamu Alaikum / Hello <strong>Sarah</strong>, reminder for your appointment tomorrow at <strong>03:00 PM</strong> with <strong>Dr. Sarah Tariq</strong> (Chair #2 - Composite Restoration).
                        </p>
                        <p className="text-slate-300 text-[10px] mt-2">
                          Please tap below to confirm your chair reservation:
                        </p>

                        {/* Interactive Buttons right inside WhatsApp */}
                        <div className="mt-3 pt-2 border-t border-slate-700/80 space-y-1.5">
                          {!isChairConfirmed ? (
                            <button
                              onClick={() => setIsChairConfirmed(true)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <span>✅ Confirm Chair (1-Tap)</span>
                            </button>
                          ) : (
                            <div className="w-full py-2 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle size={14} className="text-emerald-400" />
                              <span>Chair Confirmed! Dr. Sarah Notified</span>
                            </div>
                          )}

                          <button
                            onClick={() => setIsChairConfirmed(!isChairConfirmed)}
                            className="w-full py-1.5 bg-slate-800/90 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors"
                          >
                            🔄 Request Reschedule
                          </button>
                        </div>

                        <div className="text-right mt-1 text-[9px] text-slate-400 flex items-center justify-end gap-1">
                          <span>14:02</span>
                          <CheckCheck size={12} className="text-sky-400" />
                        </div>
                      </div>
                    )}

                    {activeWhatsAppTab === 'rx' && (
                      <div className="bg-[#1f2c34] rounded-2xl rounded-tl-none p-3.5 max-w-[92%] shadow-md border border-slate-800/80 text-xs">
                        <p className="text-[11px] font-semibold text-emerald-400 mb-1">
                          Official Digital Prescription (e-Rx)
                        </p>
                        <p className="text-slate-200 text-[11px] leading-relaxed">
                          Dr. Sarah Tariq has generated your electronic prescription following today's restorative procedure on tooth #16.
                        </p>
                        <div className="bg-[#111b21] p-2.5 rounded-lg border border-slate-700/60 my-2 space-y-1 text-[11px]">
                          <p className="font-bold text-white">💊 Amoxicillin 500mg — 1 cap TDS x 5 days</p>
                          <p className="font-bold text-white">💊 Ibuprofen 400mg — 1 tab SOS post-meals</p>
                          <p className="text-[10px] text-slate-400">Precautions: Take after food with full glass of water.</p>
                        </div>
                        <button
                          onClick={() => setShowRxModal(true)}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <FileText size={12} />
                          <span>View Official Letterhead Rx</span>
                        </button>
                        <div className="text-right mt-1 text-[9px] text-slate-400 flex items-center justify-end gap-1">
                          <span>14:45</span>
                          <CheckCheck size={12} className="text-sky-400" />
                        </div>
                      </div>
                    )}

                    {activeWhatsAppTab === 'invoice' && (
                      <div className="bg-[#1f2c34] rounded-2xl rounded-tl-none p-3.5 max-w-[92%] shadow-md border border-slate-800/80 text-xs">
                        <p className="text-[11px] font-semibold text-emerald-400 mb-1">
                          Itemized Dental Invoice #INV-2026-084
                        </p>
                        <p className="text-slate-200 text-[11px]">
                          Thank you for your visit today. Your itemized receipt has been finalized:
                        </p>
                        <div className="bg-[#111b21] p-2.5 rounded-lg border border-slate-700/60 my-2 text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span>Tooth #16 Restorative:</span>
                            <span className="font-bold text-white">{currConfig.symbol}{Math.round(150 * currencyMultiplier).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Surface Polishing:</span>
                            <span className="font-bold text-white">{currConfig.symbol}{Math.round(30 * currencyMultiplier).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-700 text-emerald-400 font-bold">
                            <span>Total Due:</span>
                            <span>{currConfig.symbol}{Math.round(180 * currencyMultiplier).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowInvoiceModal(true)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Receipt size={12} />
                          <span>Pay with Card / Apple Pay</span>
                        </button>
                        <div className="text-right mt-1 text-[9px] text-slate-400 flex items-center justify-end gap-1">
                          <span>15:10</span>
                          <CheckCheck size={12} className="text-sky-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input bar mockup */}
                  <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-slate-800 text-xs">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-slate-400 text-[11px]">
                      Type a reply...
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                      <Send size={13} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Real-Time Clinic Schedule & Webhook Reaction */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar size={18} className="text-sky-400" />
                    <span>Live Clinic Operatory Schedule Sync</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operatory status automatically updates the millisecond the patient confirms on WhatsApp
                  </p>
                </div>
                <button
                  onClick={() => setIsChairConfirmed(!isChairConfirmed)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Toggle Confirmation State</span>
                </button>
              </div>

              {/* Multi-Chair Live Schedule Cards */}
              <div className="space-y-3 mb-6">
                {/* Chair 1 */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-800">
                      CH-1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Operatory Chair #1 (Dr. Marcus)</p>
                      <p className="text-[11px] text-slate-400">Patient: Michael Chen • Scaling & Polishing</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    ● In Treatment
                  </span>
                </div>

                {/* Chair 2 (The dynamic WhatsApp synced chair!) */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isChairConfirmed
                      ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border ${
                          isChairConfirmed
                            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-600'
                            : 'bg-amber-900/60 text-amber-300 border-amber-600'
                        }`}
                      >
                        CH-2
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">Operatory Chair #2 (Dr. Sarah Tariq)</p>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded">
                            03:00 PM Tomorrow
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Patient: Sarah Jenkins • Tooth #16 Restoration
                        </p>
                      </div>
                    </div>

                    <div>
                      {isChairConfirmed ? (
                        <span className="text-xs font-bold bg-emerald-500 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                          <CheckCircle2 size={13} /> Chair Confirmed
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                          <Clock size={13} /> Awaiting WhatsApp Reply
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Synced Info */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {isChairConfirmed
                        ? '⚡ WhatsApp Webhook matched: Patient confirmed via 1-tap quick reply'
                        : '⏳ WhatsApp 24-hr reminder dispatched at 14:02. Waiting for patient tap.'}
                    </span>
                    <span className="text-sky-400 font-semibold">
                      {isChairConfirmed ? 'No-Show Risk: 0.1%' : 'No-Show Risk: 28%'}
                    </span>
                  </div>
                </div>

                {/* Chair 3 */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-800">
                      CH-3
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Operatory Chair #3 (Dr. Fatima Al-Mansoor)</p>
                      <p className="text-[11px] text-slate-400">Sterilization complete • Ready for 03:30 PM</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full">
                    ● Ready / Available
                  </span>
                </div>
              </div>

              {/* Webhook Stream Audit Log */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
                <div className="text-xs font-sans font-bold text-slate-300 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live Webhook Telemetry
                </div>
                <p className="text-emerald-400/90">
                  [14:02:08] WhatsApp Cloud API: 24h reminder template dispatched to +971 50 123 4567
                </p>
                {isChairConfirmed ? (
                  <>
                    <p className="text-sky-300">
                      [14:02:12] Webhook received: Quick reply payload &quot;CONFIRM_CHAIR_2&quot;
                    </p>
                    <p className="text-emerald-400 font-bold">
                      [14:02:12] Clinsyst Schedule: Operatory #2 updated to CONFIRMED. Lock state active.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500 italic">
                    [14:02:09] Waiting for patient button interaction on WhatsApp...
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Cut receptionist phone time from 3 hours/day to zero with automated WhatsApp workflows.
                </span>
                <button
                  onClick={() => handleOpenSignup('pro')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
                >
                  Test WhatsApp Integration →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. UNIFIED PLATFORM GRID (MULTI-CHAIR, INVENTORY, INVOICING) ─── */}
      <section id="platform-grid" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Unified Platform Architecture
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-4 tracking-tight">
              Six Interconnected Pillars Built for Modern Dental Clinics
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Eliminate disjointed third-party software. Everything from dual odontograms and inventory alerts to automated WhatsApp confirmations and multi-chair revenue analytics runs on one cohesive, lightning-fast cloud foundation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Module 1: Multi-Chair Scheduling */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-sky-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Calendar size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Multi-Chair Operatory Scheduling
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Visual multi-operatory calendar built to eliminate dead time. Automatically detect doctor chair conflicts, assign assistant staff, and track real-time transitions from waiting room to treatment chair.
              </p>
              <div className="text-xs font-semibold text-sky-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Automatic 24-hr WhatsApp sync</span>
              </div>
            </div>

            {/* Module 2: Inventory Batch & Expiry Sentinel */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-amber-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Package size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Batch & Expiry Inventory Sentinel
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Stop throwing away expired bonding agents, composite syringes, or local anesthetics. Proactive 30, 60, and 90-day expiry watchdogs and automated low-stock reorder thresholds protect clinic margins.
              </p>
              <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Real-time stock deduction on invoice</span>
              </div>
            </div>

            {/* Module 3: 360 Patient Dossier */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Activity size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                360° Chronological Clinical Dossier
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                One continuous longitudinal medical timeline uniting appointments, odontogram examinations, treatment plans, prescriptions, and invoice payments. Instant search for past radiographs and clinical flags.
              </p>
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Zero fragmented paper folders</span>
              </div>
            </div>

            {/* Module 4: Invoicing & Split Payments */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Automated Invoicing & Split Payments
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Convert completed dental procedures into itemized invoices in 1 click. Support split payments across Cash, Credit Card, and Bank Transfer with instant receipts dispatchable via WhatsApp or PDF print.
              </p>
              <div className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>99.4% billing collection audit rate</span>
              </div>
            </div>

            {/* Module 5: Digital Rx Slips */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Pill size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Digital Rx & Official Letterhead
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Create clean, error-free prescriptions with standardized dosage, frequency, and duration. Automatically stamps official clinic branding, doctor registration details, and digital signatures.
              </p>
              <div className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Zero pharmacy callback friction</span>
              </div>
            </div>

            {/* Module 6: Multi-Branch Network Management */}
            <div className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Building2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Multi-Branch DSO Network Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Designed for dental hospital groups and growing polyclinic chains. Seamlessly switch between branches, transfer stock between locations, and access centralized corporate financial reporting.
              </p>
              <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Granular doctor/reception permissions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR SECTION ────────────────────────────────────────── */}
      <section id="roi-calculator" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Practice Financial Impact Calculator
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-4 tracking-tight">
              How Much Revenue Is Your Clinic Losing to Legacy Tools & Paper?
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Drag the sliders below to calculate the recovered chair hours, reduced no-shows, and paperwork hours Clinsyst unlocks for your practice size.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Sliders Input Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sliders size={14} className="text-sky-600" />
                      Number of Operatory Chairs:
                    </label>
                    <span className="text-sm font-extrabold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                      {chairsCount} {chairsCount === 1 ? 'Chair' : 'Chairs'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={chairsCount}
                    onChange={(e) => setChairsCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>1 Solo Chair</span>
                    <span>5 Chairs</span>
                    <span>10+ Multi-Branch</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock size={14} className="text-emerald-600" />
                      Daily Patients per Chair:
                    </label>
                    <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {patientsPerDay} Patients / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={patientsPerDay}
                    onChange={(e) => setPatientsPerDay(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>5 Low Volume</span>
                    <span>15 Standard</span>
                    <span>30 High Volume</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-600" />
                      Avg. Procedure Fee ({currency}):
                    </label>
                    <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {currConfig.symbol}{avgTicket.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="350"
                    step="10"
                    value={avgTicketBaseUSD}
                    onChange={(e) => setAvgTicketBaseUSD(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Routine Care</span>
                    <span>Restorative</span>
                    <span>Implants & Aesthetic</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
                  💡 Based on verified dental industry benchmarks from 450+ practices: eliminating 6% chair gaps, automated digital charting, and capturing unbilled clinical follow-ups.
                </div>
              </div>

              {/* Calculated Outputs Column */}
              <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-slate-800 shadow-lg">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
                    <span className="text-xs uppercase font-bold tracking-wider text-sky-300">
                      Estimated Practice Uplift
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ~{roiMultiplier}x ROI
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-300">Estimated Monthly Profit Boost:</p>
                      <p className="text-3xl sm:text-4xl font-extrabold text-white mt-0.5 font-display tracking-tight">
                        +{currConfig.symbol}{totalMonthlyGain.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">/ month</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-slate-400 block">Recovered Gap Revenue:</span>
                        <strong className="text-emerald-400 text-sm">
                          +{currConfig.symbol}{monthlyRecoveredGap.toLocaleString()} / mo
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Follow-Up Treatment Capture:</span>
                        <strong className="text-sky-300 text-sm">
                          +{currConfig.symbol}{followUpCapture.toLocaleString()} / mo
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-slate-300">
                      ⏱️ Staff Paperwork Saved:{' '}
                      <strong className="text-white">~{staffHoursSaved} hours / month</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Clinsyst Pro Annual Cost:</span>
                        <span className="font-bold text-white">
                          {currConfig.symbol}{annualSoftwareCost.toLocaleString()} / yr
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-emerald-300 font-semibold">Net Annual Practice Gain:</span>
                        <span className="font-extrabold text-emerald-400 text-sm">
                          +{currConfig.symbol}{(netAnnualGain - annualSoftwareCost).toLocaleString()} / yr
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenSignup('pro')}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <span>Capture This Value in Free Trial</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. GLOBAL PRICING TIER MATRIX (MONTHLY VS ANNUAL -20%) ─────────── */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-white via-sky-50/20 to-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-sky-700 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-300">
              Transparent Global Pricing
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mt-4 tracking-tight">
              Fair, Predictable Pricing with Zero Hidden Setup Fees
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              No mandatory $2,500 onboarding penalties. No long-term lock-ins. Switch currencies or cancel anytime. All tiers include interactive dual odontograms, patient dossiers, and automated billing.
            </p>

            {/* Prominent Currency Switcher Bar (USD, PKR, AED, SAR prioritized) */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl max-w-2xl mx-auto border border-slate-300">
              <span className="text-xs font-bold text-slate-700 px-2">Currency:</span>
              <button
                onClick={() => handleSelectCurrency('USD')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'USD'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇺🇸</span>
                <span>USD ($)</span>
              </button>
              <button
                onClick={() => handleSelectCurrency('PKR')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'PKR'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇵🇰</span>
                <span>PKR (Rs.)</span>
              </button>
              <button
                onClick={() => handleSelectCurrency('AED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'AED'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇦🇪</span>
                <span>AED (Dirham)</span>
              </button>
              <button
                onClick={() => handleSelectCurrency('SAR')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'SAR'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇸🇦</span>
                <span>SAR (Riyal)</span>
              </button>
              <button
                onClick={() => handleSelectCurrency('GBP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'GBP'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇬🇧</span>
                <span>GBP (£)</span>
              </button>
              <button
                onClick={() => handleSelectCurrency('EUR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currency === 'EUR'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇪🇺</span>
                <span>EUR (€)</span>
              </button>
            </div>

            {/* IP Geolocation auto-detection badge */}
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>
                {geoInfo?.source === 'manual' || geoInfo?.source === 'url' ? (
                  <>Viewing pricing in <strong>{currency} ({currConfig.symbol.trim()})</strong> • Click any currency above to switch</>
                ) : (
                  <>📍 Local pricing for <strong>{geoInfo?.countryName || currConfig.region} ({currency})</strong> applied automatically based on IP</>
                )}
              </span>
            </div>

            {/* Monthly vs Annual Toggle (-20% discount) */}
            <div className="mt-6 inline-flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>

              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  Save 20% (2 Months Free)
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid (Starter $24, Pro $64, Network $119) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto mb-12">
            {INTERNATIONAL_PLANS.map((plan) => {
              const priceData = plan.pricing[currency];
              const displayPrice =
                billingCycle === 'annual'
                  ? priceData.formattedAnnualMonthly
                  : priceData.formattedMonthly;

              const isPro = plan.id === 'pro';

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 relative ${
                    isPro
                      ? 'bg-white border-2 border-sky-500 shadow-2xl shadow-sky-600/15 ring-4 ring-sky-500/10 md:-translate-y-2'
                      : 'bg-white border border-slate-200 hover:border-slate-300 shadow-lg'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-bold text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Sparkles size={11} /> {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-5">
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.tagline}</p>
                    </div>

                    {/* Price Figure */}
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-display tracking-tight">
                          {displayPrice}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">/ month</span>
                      </div>

                      {billingCycle === 'annual' && (
                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Billed annually ({currConfig.symbol}{priceData.annualTotal.toLocaleString()}/yr)
                        </p>
                      )}

                      {/* Competitor savings callout */}
                      <div className="mt-3 p-2 bg-slate-50 rounded-xl text-[11px] font-semibold text-sky-800 border border-slate-200/70">
                        ⚡ {priceData.competitorComparison}
                      </div>
                    </div>

                    {/* Seats & Sessions Specs */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs mb-6 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Max Seats</span>
                        <strong className="text-slate-900">{plan.maxSeats} Doctor / Staff</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Simultaneous</span>
                        <strong className="text-slate-900">{plan.maxSessions} Active Sessions</strong>
                      </div>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3 mb-8 text-xs text-slate-700">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className={feat.startsWith('Everything in') ? 'font-bold text-slate-900' : ''}>
                            {feat}
                          </span>
                        </div>
                      ))}

                      {plan.omittedFeatures?.map((omit, oIdx) => (
                        <div key={oIdx} className="flex items-start gap-2.5 text-slate-400">
                          <X size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                          <span className="line-through">{omit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan CTA */}
                  <div>
                    <button
                      onClick={() => handleOpenSignup(plan.id)}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        isPro
                          ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-lg shadow-sky-600/30'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                      }`}
                    >
                      <span>{plan.ctaText}</span>
                      <ArrowRight size={14} />
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                      14-day free trial • No credit card required
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zero-Friction Trust Badges Strip */}
          <div className="max-w-4xl mx-auto p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-around gap-4 text-xs font-semibold text-slate-700 mb-8">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-sky-600" /> 14-Day Free Full Access
            </span>
            <span className="flex items-center gap-2">
              <Lock size={16} className="text-sky-600" /> No Credit Card Required Upfront
            </span>
            <span className="flex items-center gap-2">
              <Database size={16} className="text-sky-600" /> Free White-Glove Patient Migration from Excel
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sky-600" /> Cancel Anytime Month-to-Month
            </span>
          </div>

          {/* Localized Pakistani Practice Footnote / Currency Switcher */}
          <div className="max-w-3xl mx-auto p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇵🇰</span>
              <div>
                <strong className="block text-emerald-950 font-bold">Practicing in Pakistan?</strong>
                <span className="text-emerald-800">
                  Switch to PKR (from Rs. 1,499/mo) with localized support for Pakistani Bank Transfer, JazzCash & Easypaisa.
                </span>
              </div>
            </div>
            <button
              onClick={() => setCurrency('PKR')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs whitespace-nowrap transition-colors shadow-xs"
            >
              Switch to PKR (Rs.)
            </button>
          </div>
        </div>
      </section>

      {/* ── 9. SOCIAL PROOF / PRACTITIONER REVIEWS (DUBAI, KL, DOHA) ─────── */}
      <section id="reviews" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              International Social Proof
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-4 tracking-tight">
              Trusted by Dental Surgeons in Dubai, Kuala Lumpur & Doha
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Read how dentists across the Gulf, Southeast Asia, UK, and the Americas upgraded from clunky legacy systems to Clinsyst.
            </p>
          </div>

          {/* Review Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS_DATA.map((t) => (
              <div
                key={t.id}
                className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full">
                      {t.metric}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic mb-6">
                    &quot;{t.quote}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                    style={{ backgroundColor: t.avatarBg }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900">{t.doctorName}</h4>
                      <span>{t.countryFlag}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {t.role} • {t.clinicName} ({t.chairsCount} Chairs)
                    </p>
                    <p className="text-[10px] text-slate-400">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Practice Metrics Strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">450+</p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Active Surgeries</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-display">-40%</p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">No-Show Reduction</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-sky-600 font-display">99.4%</p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Collection Rate</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600 font-display">&lt; 45s</p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Avg Charting Speed</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. CLINIC FAQ (DATA MIGRATION, HARDWARE, NOTATION, TRIAL) ─────── */}
      <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-sky-700 bg-sky-100 px-3 py-1 rounded-full border border-sky-300">
              Frequently Asked Questions
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-4 tracking-tight">
              Everything Practice Principals Need to Know
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base">
              Details on FDI notation, automated WhatsApp workflows, Excel migration, and hardware compatibility.
            </p>
          </div>

          <div className="space-y-4">
            {faqList.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-sky-600' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center text-xs text-slate-500">
            Have a custom clinical requirement or multi-branch DSO SLA query?{' '}
            <button
              onClick={() => handleOpenSignup('pro')}
              className="text-sky-600 font-semibold hover:underline"
            >
              Speak with our Implementation Team →
            </button>
          </div>
        </div>
      </section>

      {/* ── 11. FINAL CTA & FOOTER: 14-DAY TRIAL WITHOUT CREDIT CARD ───────── */}
      <section className="py-20 bg-gradient-to-r from-sky-950 via-slate-950 to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold mb-6 border border-white/20">
            <Sparkles size={13} className="text-amber-300" />
            <span>Modernize Your Practice in 5 Minutes</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-6">
            Ready to Double Your Dental Chair Efficiency & Cut No-Shows?
          </h2>

          <p className="text-sky-100 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
            Join hundreds of dental surgeries running faster consultations, automated WhatsApp confirmations, and zero-leakage billing. Start your 14-day trial in 60 seconds with no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleOpenSignup('pro')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <span>Start 14-Day Free Trial (No Card Required)</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => signInAsDemo('doctor')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-xl transition-all"
            >
              <Play size={14} className="fill-white" />
              <span>Explore Live Interactive Demo</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-sky-200/80">
            <span>✓ Cancel Anytime</span>
            <span>✓ 100% Data Ownership</span>
            <span>✓ Free Excel Patient Data Migration</span>
            <span>✓ 24/7 Dedicated Clinical Support</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-16 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
            {/* Brand column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0284c7] flex items-center justify-center text-white font-bold text-lg font-sans shadow-sm border border-white/20">
                  C
                </div>
                <span className="font-display font-bold text-xl text-white tracking-tight">
                  Clinsyst
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The next-generation cloud dental operating system. Precision dual FDI/Universal tooth charting, real-time inventory sentinel, and automated WhatsApp patient communication.
              </p>
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck size={16} className="text-sky-400" />
                <span>HIPAA, GDPR & ISO 27001 Certified Infrastructure</span>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-4">Product Pillars</h4>
              <ul className="space-y-2.5">
                <li><a href="#odontogram-demo" className="hover:text-white transition-colors">Adult & Pediatric Odontogram</a></li>
                <li><a href="#whatsapp-workflow" className="hover:text-white transition-colors">Automated WhatsApp Engine</a></li>
                <li><a href="#platform-grid" className="hover:text-white transition-colors">Multi-Chair Operatory Scheduling</a></li>
                <li><a href="#platform-grid" className="hover:text-white transition-colors">Inventory Expiry Sentinel</a></li>
                <li><a href="#platform-grid" className="hover:text-white transition-colors">360° Patient Clinical Dossier</a></li>
                <li><a href="#roi-calculator" className="hover:text-white transition-colors">Practice Financial ROI Calculator</a></li>
              </ul>
            </div>

            {/* Compare & Switch */}
            <div>
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-4">Compare & Switch</h4>
              <ul className="space-y-2.5">
                <li><a href="#pricing" className="hover:text-white transition-colors">Clinsyst vs Curve Dental ($399/mo)</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Clinsyst vs Dentrix Ascend</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Clinsyst vs CareStack</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Clinsyst vs Dentally UK</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Global Pricing Matrix (USD, AED, SAR)</a></li>
              </ul>
            </div>

            {/* International Reach & Local Currencies */}
            <div>
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-4">Global Reach</h4>
              <p className="text-slate-400 leading-relaxed mb-3">
                Serving practices across the UAE (Dubai, Abu Dhabi), Saudi Arabia (Riyadh, Jeddah), Qatar, Malaysia, United States, United Kingdom, and Pakistan.
              </p>
              <div className="flex items-center gap-2 font-semibold text-sky-400">
                <Globe size={14} />
                <span>Active Currency: {currConfig.name} ({currConfig.symbol.trim()})</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Clinsyst Practice Intelligence Suite. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 cursor-pointer">Security Compliance</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODALS: SIGN UP / SIGN IN ─────────────────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg font-sans">
                C
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-slate-900">
                  {authTab === 'signup' ? 'Start 14-Day Free Trial' : 'Sign In to Your Clinic'}
                </h3>
                <p className="text-xs text-slate-500">
                  {authTab === 'signup'
                    ? 'No credit card required. Instant 60-second setup.'
                    : 'Access your clinic records, odontograms and invoices.'}
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setAuthError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register Clinic (Free Trial)
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('signin'); setAuthError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* TAB 1: REGISTRATION FORM */}
            {authTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
                {/* Selected Plan Pill */}
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-700">Selected Plan:</span>
                    <p className="font-bold text-slate-900 capitalize text-xs">
                      {selectedPlanForSignup === 'starter'
                        ? 'Starter (Solo Practice)'
                        : selectedPlanForSignup === 'pro'
                        ? 'Clinic Pro (Growth)'
                        : 'Clinic Network (Multi-Branch)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-sky-800">
                      {INTERNATIONAL_PLANS.find((p) => p.id === selectedPlanForSignup)?.pricing[currency].formattedMonthly}/mo
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-semibold">14 Days Free</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Clinic / Practice Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Dental Studio"
                      value={signupForm.clinic_name}
                      onChange={(e) => setSignupForm({ ...signupForm, clinic_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Doctor / Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. John Smith"
                      value={signupForm.owner_name}
                      onChange={(e) => setSignupForm({ ...signupForm, owner_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="doctor@apexclinic.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+971 50 000 0000"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Password (min. 6 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create a strong password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Practice City & Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dubai Healthcare City, Block B"
                    value={signupForm.address}
                    onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {authLoading ? 'Creating Clinic Workspace...' : 'Launch Clinic in 14-Day Free Trial →'}
                </button>
              </form>
            )}

            {/* TAB 2: SIGN IN FORM */}
            {authTab === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@apexclinic.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">Password</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {authLoading ? 'Signing in...' : 'Sign In to Clinic →'}
                </button>

                {/* Instant Demo Quick Login */}
                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                  <p className="text-[11px] text-slate-500 mb-2">Want to test without signing up?</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      signInAsDemo('doctor');
                    }}
                    className="w-full py-2.5 px-4 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl font-bold text-xs border border-sky-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play size={12} className="fill-sky-800" />
                    <span>One-Click Demo Login (Preloaded Data)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── RX PREVIEW MODAL (Interactive from WhatsApp Simulator) ────────── */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-900">
            <button
              onClick={() => setShowRxModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
            >
              <X size={18} />
            </button>
            <div className="border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-sm">
                  C
                </div>
                <div>
                  <h4 className="font-bold text-sm">Apex Dental Studio</h4>
                  <p className="text-[10px] text-slate-500">Dr. Sarah Tariq • Registration #D-84920</p>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-2 mb-4">
              <p><strong>Patient:</strong> Sarah Jenkins (34y, F)</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1 mt-2">
                <p>1. Amoxicillin 500mg capsules - 1 cap TDS x 5 days</p>
                <p>2. Ibuprofen 400mg tablets - 1 tab SOS post-meals</p>
              </div>
              <p className="text-[10px] text-slate-500 italic">Dispatched automatically via WhatsApp Cloud API.</p>
            </div>
            <button
              onClick={() => setShowRxModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close Prescription Preview
            </button>
          </div>
        </div>
      )}

      {/* ── INVOICE PAYMENT MODAL (Interactive from WhatsApp Simulator) ───── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-900">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
            >
              <X size={18} />
            </button>
            <div className="border-b border-slate-200 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Secure Payment Link
              </span>
              <h4 className="font-bold text-base mt-1">Apex Dental Care • Invoice #INV-2026-084</h4>
            </div>
            <div className="text-xs space-y-2 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Tooth #16 Direct Composite:</span>
                <span className="font-bold">{currConfig.symbol}{Math.round(150 * currencyMultiplier).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Surface Debridement:</span>
                <span className="font-bold">{currConfig.symbol}{Math.round(30 * currencyMultiplier).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-slate-900">
                <span>Total Amount Due:</span>
                <span className="text-emerald-600">{currConfig.symbol}{Math.round(180 * currencyMultiplier).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Receipt size={14} />
              <span>Simulate One-Click Apple Pay / Card Payment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
