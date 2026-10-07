export type CurrencyCode = 'USD' | 'AED' | 'SAR' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'PKR';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  flag: string;
  region: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    flag: '🇺🇸',
    region: 'North America & International',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED ',
    locale: 'ar-AE',
    flag: '🇦🇪',
    region: 'UAE & GCC Clinics',
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR ',
    locale: 'ar-SA',
    flag: '🇸🇦',
    region: 'Saudi Arabia & Gulf',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    flag: '🇬🇧',
    region: 'United Kingdom',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'de-DE',
    flag: '🇪🇺',
    region: 'European Union',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    locale: 'en-CA',
    flag: '🇨🇦',
    region: 'Canada',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    locale: 'en-AU',
    flag: '🇦🇺',
    region: 'Australia & New Zealand',
  },
  PKR: {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: 'Rs. ',
    locale: 'en-PK',
    flag: '🇵🇰',
    region: 'Pakistan & South Asia',
  },
};

export interface PlanPricing {
  monthly: number;
  annualMonthly: number; // monthly rate when billed annually
  annualTotal: number;
  formattedMonthly: string;
  formattedAnnualMonthly: string;
  competitorComparison: string;
}

export interface InternationalPlan {
  id: 'starter' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  badge?: string;
  popular?: boolean;
  maxSeats: number;
  maxSessions: number;
  pricing: Record<CurrencyCode, PlanPricing>;
  features: string[];
  omittedFeatures?: string[];
  ctaText: string;
}

export const INTERNATIONAL_PLANS: InternationalPlan[] = [
  {
    id: 'starter',
    name: 'Solo Practice',
    tagline: 'Ideal for independent dentists & single-chair operatories',
    maxSeats: 2,
    maxSessions: 2,
    pricing: {
      USD: {
        monthly: 29,
        annualMonthly: 24,
        annualTotal: 288,
        formattedMonthly: '$29',
        formattedAnnualMonthly: '$24',
        competitorComparison: 'Save 93% vs Curve Dental ($399/mo)',
      },
      AED: {
        monthly: 109,
        annualMonthly: 89,
        annualTotal: 1068,
        formattedMonthly: 'AED 109',
        formattedAnnualMonthly: 'AED 89',
        competitorComparison: 'Save 85% vs GCC Enterprise Solutions',
      },
      SAR: {
        monthly: 110,
        annualMonthly: 90,
        annualTotal: 1080,
        formattedMonthly: 'SAR 110',
        formattedAnnualMonthly: 'SAR 90',
        competitorComparison: 'Save 85% vs Saudi Legacy Hospital Systems',
      },
      GBP: {
        monthly: 24,
        annualMonthly: 19,
        annualTotal: 228,
        formattedMonthly: '£24',
        formattedAnnualMonthly: '£19',
        competitorComparison: 'Save 81% vs Dentally Starter (£125/mo)',
      },
      EUR: {
        monthly: 28,
        annualMonthly: 22,
        annualTotal: 264,
        formattedMonthly: '€28',
        formattedAnnualMonthly: '€22',
        competitorComparison: 'Save 88% vs European Cloud EMRs',
      },
      CAD: {
        monthly: 39,
        annualMonthly: 32,
        annualTotal: 384,
        formattedMonthly: 'CA$39',
        formattedAnnualMonthly: 'CA$32',
        competitorComparison: 'Save 92% vs North American suites',
      },
      AUD: {
        monthly: 45,
        annualMonthly: 36,
        annualTotal: 432,
        formattedMonthly: 'A$45',
        formattedAnnualMonthly: 'A$36',
        competitorComparison: 'Save 85% vs Australian Dental SaaS',
      },
      PKR: {
        monthly: 1799,
        annualMonthly: 1499,
        annualTotal: 17988,
        formattedMonthly: 'Rs. 1,799',
        formattedAnnualMonthly: 'Rs. 1,499',
        competitorComparison: '25% cheaper than jDent with zero setup cost',
      },
    },
    features: [
      'Interactive 32-Tooth Adult Odontogram (Dual FDI & Universal)',
      'Interactive 20-Tooth Pediatric Odontogram (Dual FDI & Universal)',
      'Automated WhatsApp 1-Click Appointment Confirmations',
      '360° Patient Clinical Dossier Timeline',
      'Appointment Scheduling & Operatory Management',
      'Itemized Invoices, Receipts & Digital Rx Slips',
      'Up to 2 Doctor/Staff Seats',
      'Encrypted Cloud Backup & HIPAA/GDPR Compliance',
      'Standard WhatsApp & Email Support',
    ],
    omittedFeatures: [
      'Inventory Batch & Expiry Sentinel Alerts',
      'Advanced Multi-Chair Financial Analytics',
      'Multi-Branch Switching & DSO Sync',
    ],
    ctaText: 'Start 14-Day Free Trial',
  },
  {
    id: 'pro',
    name: 'Clinic Pro',
    tagline: 'Engineered for high-growth 2–5 chair dental practices',
    badge: 'Most Popular',
    popular: true,
    maxSeats: 5,
    maxSessions: 5,
    pricing: {
      USD: {
        monthly: 79,
        annualMonthly: 64,
        annualTotal: 768,
        formattedMonthly: '$79',
        formattedAnnualMonthly: '$64',
        competitorComparison: 'Save 85% vs Curve & Dentrix Ascend ($400-$600/mo)',
      },
      AED: {
        monthly: 289,
        annualMonthly: 235,
        annualTotal: 2820,
        formattedMonthly: 'AED 289',
        formattedAnnualMonthly: 'AED 235',
        competitorComparison: 'Dubai Healthcare City & Abu Dhabi practice favorite',
      },
      SAR: {
        monthly: 295,
        annualMonthly: 240,
        annualTotal: 2880,
        formattedMonthly: 'SAR 295',
        formattedAnnualMonthly: 'SAR 240',
        competitorComparison: 'Riyadh & Jeddah private polyclinic standard',
      },
      GBP: {
        monthly: 64,
        annualMonthly: 52,
        annualTotal: 624,
        formattedMonthly: '£64',
        formattedAnnualMonthly: '£52',
        competitorComparison: 'Save 75% vs Dentally Pro (£220-£320/mo)',
      },
      EUR: {
        monthly: 72,
        annualMonthly: 59,
        annualTotal: 708,
        formattedMonthly: '€72',
        formattedAnnualMonthly: '€59',
        competitorComparison: 'Full cloud suite with zero hidden setup fees',
      },
      CAD: {
        monthly: 105,
        annualMonthly: 86,
        annualTotal: 1032,
        formattedMonthly: 'CA$105',
        formattedAnnualMonthly: 'CA$86',
        competitorComparison: 'Comprehensive Canadian dental compliance',
      },
      AUD: {
        monthly: 119,
        annualMonthly: 96,
        annualTotal: 1152,
        formattedMonthly: 'A$119',
        formattedAnnualMonthly: 'A$96',
        competitorComparison: 'Optimized for Australian practice workflows',
      },
      PKR: {
        monthly: 3499,
        annualMonthly: 2899,
        annualTotal: 34788,
        formattedMonthly: 'Rs. 3,499',
        formattedAnnualMonthly: 'Rs. 2,899',
        competitorComparison: 'Best value for multi-doctor Pakistani practices',
      },
    },
    features: [
      'Everything in Solo Practice, plus:',
      'Batch Number & Expiry Alert Inventory Sentinel',
      'Low-Stock Automated Threshold Reordering',
      'Automated WhatsApp Reminders, Rx Slips & Invoice Links',
      'Comprehensive Financial & Revenue Analytics',
      'Multi-Chair Operatory Conflict Detection',
      'Advanced Treatment Planning & Itemized Estimates',
      'Split Payments & Multi-Method Tracking (Card, Cash, Bank)',
      'Up to 5 Doctor/Staff Seats with Role Permissions',
      'Priority WhatsApp & Concierge Onboarding',
    ],
    ctaText: 'Start 14-Day Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Clinic Network',
    tagline: 'Multi-branch dental hospital networks & DSO groups',
    badge: 'Enterprise Network',
    maxSeats: 25,
    maxSessions: 25,
    pricing: {
      USD: {
        monthly: 149,
        annualMonthly: 119,
        annualTotal: 1428,
        formattedMonthly: '$149',
        formattedAnnualMonthly: '$119',
        competitorComparison: 'Save 80%+ vs CareStack & Dentrix Enterprise',
      },
      AED: {
        monthly: 549,
        annualMonthly: 439,
        annualTotal: 5268,
        formattedMonthly: 'AED 549',
        formattedAnnualMonthly: 'AED 439',
        competitorComparison: 'Designed for Gulf multi-specialty dental chains',
      },
      SAR: {
        monthly: 560,
        annualMonthly: 445,
        annualTotal: 5340,
        formattedMonthly: 'SAR 560',
        formattedAnnualMonthly: 'SAR 445',
        competitorComparison: 'Optimized for Saudi MOH & multi-branch groups',
      },
      GBP: {
        monthly: 119,
        annualMonthly: 95,
        annualTotal: 1140,
        formattedMonthly: '£119',
        formattedAnnualMonthly: '£95',
        competitorComparison: 'Unlimited operatories & multi-clinic management',
      },
      EUR: {
        monthly: 139,
        annualMonthly: 109,
        annualTotal: 1308,
        formattedMonthly: '€139',
        formattedAnnualMonthly: '€109',
        competitorComparison: 'Enterprise multi-clinic compliance & SLA',
      },
      CAD: {
        monthly: 199,
        annualMonthly: 159,
        annualTotal: 1908,
        formattedMonthly: 'CA$199',
        formattedAnnualMonthly: 'CA$159',
        competitorComparison: 'Enterprise DSO centralized management',
      },
      AUD: {
        monthly: 225,
        annualMonthly: 179,
        annualTotal: 2148,
        formattedMonthly: 'A$225',
        formattedAnnualMonthly: 'A$179',
        competitorComparison: 'Multi-location network sync & custom reporting',
      },
      PKR: {
        monthly: 5999,
        annualMonthly: 4999,
        annualTotal: 59988,
        formattedMonthly: 'Rs. 5,999',
        formattedAnnualMonthly: 'Rs. 4,999',
        competitorComparison: 'Complete dental hospital & department hierarchy',
      },
    },
    features: [
      'Everything in Clinic Pro, plus:',
      'Multi-Branch Clinic Network Management',
      'Granular Role-Based Access (Doctor, Reception, Lab, Admin)',
      'Centralized Group Stock & Inter-Branch Transfers',
      'Custom Letterhead & Clinic Brand Theming',
      'Up to 25 Doctor/Staff Seats (Expandable on demand)',
      'Dedicated Customer Success Manager & 99.9% SLA',
      'Free VIP Patient Record Migration Concierge from Excel/EMRs',
    ],
    ctaText: 'Start Network Trial',
  },
];

export interface CompetitorComparisonRow {
  feature: string;
  category: 'pricing' | 'clinical' | 'operations' | 'support';
  clinsyst: string | boolean;
  curveDental: string | boolean;
  dentrixAscend: string | boolean;
  carestack: string | boolean;
  dentallyUK: string | boolean;
  legacyDesktop: string | boolean;
  highlightClinsyst?: boolean;
}

export const COMPETITOR_COMPARISON_DATA: CompetitorComparisonRow[] = [
  {
    feature: 'Transparent Pricing Published Online',
    category: 'pricing',
    clinsyst: 'Yes — From $29/mo (No surprise fees)',
    curveDental: 'Hidden (Requires sales demo)',
    dentrixAscend: 'Hidden (Custom quote only)',
    carestack: 'Hidden (Starts ~$698/mo)',
    dentallyUK: 'Tiered (£125-£320/mo)',
    legacyDesktop: 'Hidden ($3,000+ upfront)',
    highlightClinsyst: true,
  },
  {
    feature: 'Setup & Onboarding Fees',
    category: 'pricing',
    clinsyst: '$0 (Completely Free Setup)',
    curveDental: '$1,500 – $2,500',
    dentrixAscend: '$2,500 – $4,500',
    carestack: '$2,000 – $3,500',
    dentallyUK: '£500 – £1,500',
    legacyDesktop: '$3,500+ (Server + IT)',
    highlightClinsyst: true,
  },
  {
    feature: 'Contract Lock-In Period',
    category: 'pricing',
    clinsyst: 'Month-to-month or Annual (Cancel anytime)',
    curveDental: '1 – 3 Year binding contract',
    dentrixAscend: '1 – 3 Year binding contract',
    carestack: '1 – 2 Year contract',
    dentallyUK: '12-Month contract',
    legacyDesktop: 'Perpetual lock-in + annual support',
    highlightClinsyst: true,
  },
  {
    feature: 'Interactive 32-Tooth Adult & 20-Tooth Child Odontogram',
    category: 'clinical',
    clinsyst: true,
    curveDental: true,
    dentrixAscend: true,
    carestack: true,
    dentallyUK: true,
    legacyDesktop: 'Clunky / 1990s UI',
    highlightClinsyst: true,
  },
  {
    feature: '360° Unified Patient Dossier Timeline',
    category: 'clinical',
    clinsyst: true,
    curveDental: 'Partial (Fragmented screens)',
    dentrixAscend: 'Partial',
    carestack: true,
    dentallyUK: 'Partial',
    legacyDesktop: false,
    highlightClinsyst: true,
  },
  {
    feature: 'Integrated Inventory Batch & Expiry Sentinel',
    category: 'operations',
    clinsyst: true,
    curveDental: false,
    dentrixAscend: 'Separate Add-On ($$$)',
    carestack: 'Partial',
    dentallyUK: 'Limited',
    legacyDesktop: false,
    highlightClinsyst: true,
  },
  {
    feature: 'Digital Rx Pad with Automatic Clinic Letterhead',
    category: 'clinical',
    clinsyst: true,
    curveDental: 'Requires eRx addon',
    dentrixAscend: 'Requires eRx addon',
    carestack: true,
    dentallyUK: true,
    legacyDesktop: 'Manual paper or slow printer driver',
    highlightClinsyst: true,
  },
  {
    feature: 'Cloud-Native (Access on Mac, PC, iPad, Phone)',
    category: 'operations',
    clinsyst: true,
    curveDental: true,
    dentrixAscend: true,
    carestack: true,
    dentallyUK: true,
    legacyDesktop: false,
    highlightClinsyst: true,
  },
  {
    feature: 'Time to Go Live in Clinic',
    category: 'operations',
    clinsyst: '< 2 Minutes (Instant Cloud Provisioning)',
    curveDental: '4 – 8 Weeks onboarding',
    dentrixAscend: '6 – 10 Weeks onboarding',
    carestack: '4 – 8 Weeks onboarding',
    dentallyUK: '2 – 4 Weeks onboarding',
    legacyDesktop: 'Multiple technician visits',
    highlightClinsyst: true,
  },
  {
    feature: 'Free 14-Day Full Access Trial (No Card Needed)',
    category: 'support',
    clinsyst: true,
    curveDental: false,
    dentrixAscend: false,
    carestack: false,
    dentallyUK: false,
    legacyDesktop: false,
    highlightClinsyst: true,
  },
];

export interface TestimonialItem {
  id: string;
  doctorName: string;
  clinicName: string;
  location: string;
  countryFlag: string;
  role: string;
  chairsCount: number;
  metric: string;
  quote: string;
  avatarBg: string;
  initials: string;
}

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: 't-1',
    doctorName: 'Dr. Fatima Al-Mansoor, DDS',
    clinicName: 'Apex Dental Care & Implant Center',
    location: 'Dubai Healthcare City, UAE',
    countryFlag: '🇦🇪',
    role: 'Clinical Director',
    chairsCount: 6,
    metric: 'Zero Drug & Material Waste',
    quote:
      'The FDI 2-digit charting combined with the automated WhatsApp reminders has transformed our Dubai clinic. No-shows dropped by 42% in our first month, and the real-time AED billing and inventory expiry watchdog saved us thousands in unused composite resins.',
    avatarBg: '#0284c7',
    initials: 'FA',
  },
  {
    id: 't-2',
    doctorName: 'Dr. Ahmad Farhan, BDS, FICD',
    clinicName: 'Horizon Dental Specialists & Aesthetics',
    location: 'Bukit Bintang, Kuala Lumpur, Malaysia',
    countryFlag: '🇲🇾',
    role: 'Practice Principal & Orthodontist',
    chairsCount: 4,
    metric: '-45% Patient No-Shows',
    quote:
      'In Southeast Asia, WhatsApp is how patients communicate. Clinsyst’s 1-click WhatsApp appointment confirmations directly updating our operatory schedule completely eliminated chair dead-time. Having native FDI notation was the deciding factor.',
    avatarBg: '#059669',
    initials: 'AF',
  },
  {
    id: 't-3',
    doctorName: 'Dr. Reem Al-Kuwari, DDS, MSc',
    clinicName: 'Pearl Dental & Aesthetic Polyclinic',
    location: 'West Bay, Doha, Qatar',
    countryFlag: '🇶🇦',
    role: 'Managing Partner',
    chairsCount: 5,
    metric: '100% Audit Collection Rate',
    quote:
      'We replaced an overpriced legacy system costing $800/mo. Clinsyst gave our 5-chair clinic multi-operatory coordination, itemized digital receipts sent via WhatsApp in SAR/QAR/USD, and instantaneous cloud access on iPads in every operatory.',
    avatarBg: '#d97706',
    initials: 'RA',
  },
  {
    id: 't-4',
    doctorName: 'Dr. Marcus Vance, DDS',
    clinicName: 'Vance Aesthetic & Restorative Dentistry',
    location: 'Chicago, Illinois, USA',
    countryFlag: '🇺🇸',
    role: 'Practice Principal',
    chairsCount: 4,
    metric: '+38% Chair Utilization',
    quote:
      'We replaced Curve Dental with Clinsyst. We were paying nearly $700 every single month with add-ons. Clinsyst took our front desk 15 minutes to learn, the interactive Universal/FDI odontogram is faster by miles, and our chair idle time dropped by over 35%.',
    avatarBg: '#4f46e5',
    initials: 'MV',
  },
  {
    id: 't-5',
    doctorName: 'Dr. Sarah Tariq, BDS, RDS',
    clinicName: 'Dentivista Dental & Aesthetics Clinic',
    location: 'Downtown Royal Orchard, Multan',
    countryFlag: '🇵🇰',
    role: 'Chief Dental Surgeon',
    chairsCount: 3,
    metric: '< 45 Sec Charting Speed',
    quote:
      'The surface-level tooth notation and instant prescription generation saves me at least 10 minutes per patient consultation. Patient dossiers give me total clinical clarity before the patient even sits in the dental operatory chair.',
    avatarBg: '#3c5e27',
    initials: 'ST',
  },
  {
    id: 't-6',
    doctorName: 'Dr. Oliver Wright, BDS, MSc Ortho',
    clinicName: 'Harley Street Smile Studio',
    location: 'London, United Kingdom',
    countryFlag: '🇬🇧',
    role: 'Orthodontic Specialist',
    chairsCount: 5,
    metric: '£3,200 Annual Cost Saved',
    quote:
      'In the UK, legacy dental systems like Dentally and Software of Excellence charge heavily per surgery plus steep onboarding. Clinsyst gives our multi-doctor practice identical clinical charting depth with an interface our associates actually love using.',
    avatarBg: '#7c3aed',
    initials: 'OW',
  },
];
