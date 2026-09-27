import {
  Patient,
  Appointment,
  Invoice,
  InvoiceItem,
  Examination,
  Treatment,
  Prescription,
  PrescriptionItem,
  InventoryItem,
  Staff,
} from './types';

export const DEMO_ROLE_KEY = 'dentivista_demo_role';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(DEMO_ROLE_KEY);
}

export function getDemoRole(): 'doctor' | 'admin' | 'receptionist' | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(DEMO_ROLE_KEY) as 'doctor' | 'admin' | 'receptionist') || null;
}

// Dynamic date helpers
const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const inTwoDaysStr = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const inFiveDaysStr = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const lastWeekStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// ─── DEMO STAFF ──────────────────────────────────────────────────────
export const DEMO_STAFF_MEMBERS: Staff[] = [
  {
    id: 'staff-demo-doc',
    user_id: 'user-demo-doc',
    clinic_id: 'clinic-dentivista-01',
    name: 'Dr. Sarah Tariq',
    role: 'doctor',
    email: 'sarah@dentivista.com',
    phone: '+92 300 5551234',
    specialization: 'Lead Dental Surgeon & Implantologist',
    active: true,
    created_at: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'staff-demo-admin',
    user_id: 'user-demo-admin',
    clinic_id: 'clinic-dentivista-01',
    name: 'Clinic Administrator',
    role: 'admin',
    email: 'admin@dentivista.com',
    phone: '+92 300 1112233',
    specialization: 'Operations & Management',
    active: true,
    created_at: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'staff-demo-rec',
    user_id: 'user-demo-rec',
    clinic_id: 'clinic-dentivista-01',
    name: 'Ayesha Khan',
    role: 'receptionist',
    email: 'reception@dentivista.com',
    phone: '+92 300 4445566',
    specialization: 'Front Desk & Patient Coordinator',
    active: true,
    created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'staff-demo-doc2',
    user_id: 'user-demo-doc2',
    clinic_id: 'clinic-dentivista-01',
    name: 'Dr. Hamza Malik',
    role: 'doctor',
    email: 'hamza.malik@dentivista.com',
    phone: '+92 300 7778899',
    specialization: 'Consultant Orthodontist',
    active: true,
    created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── DEMO PATIENTS ───────────────────────────────────────────────────
export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'pat-demo-01',
    name: 'Tariq Mehmood',
    email: 'tariq.mehmood@example.com',
    phone: '+92 300 1234567',
    date_of_birth: '1979-05-14',
    gender: 'male',
    blood_group: 'B+',
    address: 'House #45, Block C, Gulshan-e-Iqbal, Multan',
    emergency_contact: 'Wife - 0301-7654321',
    medical_history: 'Hypertension (managed with Amlodipine 5mg). No known drug allergies.',
    notes: 'Sensitive to cold on lower right quadrant. Very cooperative patient.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'pat-demo-02',
    name: 'Fatima Zahra',
    email: 'fatima.zahra@example.com',
    phone: '+92 321 9876543',
    date_of_birth: '1996-11-22',
    gender: 'female',
    blood_group: 'O+',
    address: 'Flat 4B, Royal Orchard Heights, Multan',
    emergency_contact: 'Brother - 0322-8765432',
    medical_history: 'None reported. Asthmatic (carries Salbutamol inhaler).',
    notes: 'Interested in smile aesthetics & porcelain veneers for anterior diastema.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'pat-demo-03',
    name: 'Muhammad Bilal',
    email: 'bilal.muhammad@example.com',
    phone: '+92 333 4567890',
    date_of_birth: '1990-08-30',
    gender: 'male',
    blood_group: 'A+',
    address: 'Street 9, Officers Colony, Cantt, Multan',
    emergency_contact: 'Father - 0334-1122334',
    medical_history: 'ALLERGIC TO PENICILLIN. Mild seasonal sinusitis.',
    notes: 'Implant consultation for missing upper left premolar #24.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'pat-demo-04',
    name: 'Zainab Bibi (Child)',
    email: 'sana.parent@example.com',
    phone: '+92 301 2345678',
    date_of_birth: '2018-03-12',
    gender: 'female',
    blood_group: 'AB+',
    address: 'Sector B, DHA Phase 1, Multan',
    emergency_contact: 'Mother: Sana Bibi - 0301-2345678',
    medical_history: 'No known systemic health conditions or allergies.',
    notes: 'Pediatric checkup for primary molar decay. Very calm during dental examinations.',
    created_at: yesterdayStr,
    updated_at: todayStr,
  },
  {
    id: 'pat-demo-05',
    name: 'Usman Ali',
    email: 'usman.ali99@example.com',
    phone: '+92 345 6789012',
    date_of_birth: '1972-01-19',
    gender: 'male',
    blood_group: 'O-',
    address: 'Model Town, Street 12, Multan',
    emergency_contact: 'Son - 0346-5544332',
    medical_history: 'Type 2 Diabetes (HbA1c 6.8). Regular morning insulin.',
    notes: 'Moderate generalized periodontitis. Needs deep scaling & root planing recall.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
];

// ─── DEMO APPOINTMENTS ───────────────────────────────────────────────
export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-demo-01',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    appointment_date: todayStr,
    appointment_time: '10:00',
    duration_minutes: 45,
    status: 'scheduled',
    procedure: 'Composite Restoration (Tooth #46)',
    notes: 'Class II restoration. Anesthesia recommended.',
    created_at: yesterdayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-02',
    patient_id: 'pat-demo-03',
    doctor_id: 'staff-demo-doc',
    appointment_date: todayStr,
    appointment_time: '11:30',
    duration_minutes: 60,
    status: 'scheduled',
    procedure: 'Titanium Dental Implant Consultation',
    notes: 'Review CBCT 3D scan and discuss bone grafting.',
    created_at: yesterdayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[2],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-03',
    patient_id: 'pat-demo-02',
    doctor_id: 'staff-demo-doc',
    appointment_date: todayStr,
    appointment_time: '14:00',
    duration_minutes: 40,
    status: 'completed',
    procedure: 'Ultrasonic Scaling & Polishing',
    notes: 'Procedure went smoothly. Post-care instructions delivered.',
    created_at: yesterdayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[1],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-04',
    patient_id: 'pat-demo-04',
    doctor_id: 'staff-demo-doc',
    appointment_date: tomorrowStr,
    appointment_time: '15:30',
    duration_minutes: 30,
    status: 'scheduled',
    procedure: 'Pediatric Preventive Sealants (#54, #64)',
    notes: 'Child friendly appointment. Give reward sticker after.',
    created_at: yesterdayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[3],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-05',
    patient_id: 'pat-demo-05',
    doctor_id: 'staff-demo-doc',
    appointment_date: yesterdayStr,
    appointment_time: '11:00',
    duration_minutes: 45,
    status: 'no_show',
    procedure: 'Gingival Deep Cleaning & Root Planing',
    notes: 'Patient was unreachable. Sent WhatsApp reschedule message.',
    created_at: lastWeekStr,
    updated_at: yesterdayStr,
    patient: DEMO_PATIENTS[4],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-06',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    appointment_date: inTwoDaysStr,
    appointment_time: '16:00',
    duration_minutes: 45,
    status: 'scheduled',
    procedure: 'Zirconia Crown Placement (#25)',
    notes: 'Crown received from dental lab with verified margins.',
    created_at: yesterdayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'apt-demo-07',
    patient_id: 'pat-demo-02',
    doctor_id: 'staff-demo-doc2',
    appointment_date: inFiveDaysStr,
    appointment_time: '12:00',
    duration_minutes: 30,
    status: 'scheduled',
    procedure: 'Orthodontic Alignment Consultation',
    notes: 'Clear aligners evaluation with Dr. Hamza Malik.',
    created_at: todayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[1],
    doctor: DEMO_STAFF_MEMBERS[3],
  },
];

// ─── DEMO DENTAL EXAMINATIONS ────────────────────────────────────────
export const DEMO_EXAMINATIONS: Examination[] = [
  {
    id: 'exam-demo-01',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    examination_date: lastWeekStr,
    dentition_type: 'adult',
    chief_complaint: 'Severe throbbing pain and hot/cold sensitivity on lower right tooth #46.',
    gingival_condition: 'Localized marginal inflammation & bleeding at #46',
    plaque_level: 'Moderate',
    soft_tissue_notes: 'Oral mucosa, palate, and tongue appear healthy without ulcerations.',
    teeth_findings: {
      '46': {
        toothNumber: '46',
        toothName: 'Lower Right First Molar',
        condition: 'caries',
        surfaces: ['O', 'D'],
        notes: 'Deep disto-occlusal carious lesion encroaching pulp chamber.',
        updatedAt: lastWeekStr,
      },
      '16': {
        toothNumber: '16',
        toothName: 'Upper Right First Molar',
        condition: 'filling',
        surfaces: ['O'],
        notes: 'Sound amalgam restoration present, margins intact.',
        updatedAt: lastWeekStr,
      },
      '24': {
        toothNumber: '24',
        toothName: 'Upper Left First Premolar',
        condition: 'rct',
        surfaces: ['O'],
        notes: 'Completed endodontic treatment, radiographically sound.',
        updatedAt: lastWeekStr,
      },
      '25': {
        toothNumber: '25',
        toothName: 'Upper Left Second Premolar',
        condition: 'crown',
        surfaces: ['B', 'L', 'M', 'D', 'O'],
        notes: 'Full coverage Zirconia crown.',
        updatedAt: lastWeekStr,
      },
      '36': {
        toothNumber: '36',
        toothName: 'Lower Left First Molar',
        condition: 'implant',
        surfaces: ['O'],
        notes: 'Titanium implant fixture well-integrated, screw-retained crown.',
        updatedAt: lastWeekStr,
      },
      '18': {
        toothNumber: '18',
        toothName: 'Upper Right Third Molar',
        condition: 'missing',
        surfaces: [],
        notes: 'Surgically extracted 2 years ago.',
        updatedAt: lastWeekStr,
      },
    },
    clinical_notes: 'Vitality test negative on #46. Percussion sensitive. Treatment plan: Root Canal Treatment followed by PFM or Zirconia crown.',
    treatment_plan_notes: 'Phase 1: RCT #46 + Meds. Phase 2: Core buildup + Crown #46.',
    created_at: lastWeekStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'exam-demo-02',
    patient_id: 'pat-demo-04',
    doctor_id: 'staff-demo-doc',
    examination_date: yesterdayStr,
    dentition_type: 'child',
    chief_complaint: 'Mother noticed small brown spot on upper right baby tooth.',
    gingival_condition: 'Healthy pink gingiva',
    plaque_level: 'Mild',
    soft_tissue_notes: 'No aphthous ulcers, healthy frenum attachments.',
    teeth_findings: {
      '54': {
        toothNumber: '54',
        toothName: 'Upper Right First Primary Molar',
        condition: 'caries',
        surfaces: ['O'],
        notes: 'Superficial enamel-dentin lesion.',
        updatedAt: yesterdayStr,
      },
      '64': {
        toothNumber: '64',
        toothName: 'Upper Left First Primary Molar',
        condition: 'filling',
        surfaces: ['O'],
        notes: 'Preventive composite pit and fissure sealant.',
        updatedAt: yesterdayStr,
      },
      '75': {
        toothNumber: '75',
        toothName: 'Lower Left Second Primary Molar',
        condition: 'caries',
        surfaces: ['O'],
        notes: 'Incipient occlusal caries, fluoride treatment indicated.',
        updatedAt: yesterdayStr,
      },
    },
    clinical_notes: 'High caries risk index. Recommended dietary counseling on sugary snacks and twice daily brushing with fluoridated toothpaste.',
    treatment_plan_notes: '1. Glass Ionomer / Composite filling on #54. 2. Topical APF fluoride gel.',
    created_at: yesterdayStr,
    patient: DEMO_PATIENTS[3],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
];

// ─── DEMO TREATMENTS ─────────────────────────────────────────────────
export const DEMO_TREATMENTS: Treatment[] = [
  {
    id: 'trt-demo-01',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    treatment_date: lastWeekStr,
    tooth_number: '46',
    procedure_name: 'Root Canal Treatment (RCT - Molar)',
    cost: 15000,
    status: 'completed',
    notes: 'Access cavity prepared, biomechanical preparation completed with rotary files, obturated with gutta-percha and AH Plus sealer.',
    invoice_id: 'inv-demo-01',
    created_at: lastWeekStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'trt-demo-02',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    treatment_date: todayStr,
    tooth_number: '46',
    procedure_name: 'Composite Restoration (Tooth-Colored Filling)',
    cost: 6500,
    status: 'in_progress',
    notes: 'Post-endodontic core restoration using 3M Filtek Z350 XT shade A2.',
    invoice_id: 'inv-demo-01',
    created_at: todayStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'trt-demo-03',
    patient_id: 'pat-demo-03',
    doctor_id: 'staff-demo-doc',
    treatment_date: todayStr,
    tooth_number: '24',
    procedure_name: 'Titanium Dental Implant Placement',
    cost: 85000,
    status: 'planned',
    notes: 'Osseointegrated 3.8 x 11.5mm titanium fixture with primary stability >35Ncm.',
    invoice_id: 'inv-demo-02',
    created_at: todayStr,
    patient: DEMO_PATIENTS[2],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'trt-demo-04',
    patient_id: 'pat-demo-02',
    doctor_id: 'staff-demo-doc',
    treatment_date: todayStr,
    tooth_number: 'Upper & Lower',
    procedure_name: 'Ultrasonic Scaling & Polishing',
    cost: 5000,
    status: 'completed',
    notes: 'Supragingival and subgingival plaque debridement. Fluoride polishing paste applied.',
    invoice_id: 'inv-demo-03',
    created_at: todayStr,
    patient: DEMO_PATIENTS[1],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
  {
    id: 'trt-demo-05',
    patient_id: 'pat-demo-04',
    doctor_id: 'staff-demo-doc',
    treatment_date: yesterdayStr,
    tooth_number: '54',
    procedure_name: 'Pediatric Composite Restoration',
    cost: 4500,
    status: 'completed',
    notes: 'Minimal cavity prep, bonded with Kerr OptiBond and restorative flowable composite.',
    invoice_id: null,
    created_at: yesterdayStr,
    patient: DEMO_PATIENTS[3],
    doctor: DEMO_STAFF_MEMBERS[0],
  },
];

// ─── DEMO PRESCRIPTIONS ──────────────────────────────────────────────
export const DEMO_PRESCRIPTIONS: (Prescription & { items: PrescriptionItem[] })[] = [
  {
    id: 'pr-demo-01',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    prescription_date: todayStr,
    diagnosis: 'Acute Pulpitis & Post-Endodontic Therapy #46',
    notes: 'Take medications with plenty of water. Avoid hot or extremely cold beverages on the right jaw.',
    created_at: todayStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
    items: [
      {
        id: 'pi-demo-01',
        prescription_id: 'pr-demo-01',
        medicine_name: 'Augmentin (Amoxicillin/Clavulanate) 625mg',
        dosage: '1 Tablet',
        frequency: 'Three times daily (TDS / 8-hourly)',
        duration: '5 Days',
        instructions: 'Take after meals to avoid gastrointestinal upset',
      },
      {
        id: 'pi-demo-02',
        prescription_id: 'pr-demo-01',
        medicine_name: 'Ibuprofen (Brufen) 400mg',
        dosage: '1 Tablet',
        frequency: 'As needed for severe pain (SOS / Max 3x daily)',
        duration: '3 Days',
        instructions: 'Always take after eating food',
      },
      {
        id: 'pi-demo-03',
        prescription_id: 'pr-demo-01',
        medicine_name: 'Chlorhexidine Gluconate 0.2% Mouthwash',
        dosage: '10 ml',
        frequency: 'Twice daily after brushing',
        duration: '7 Days',
        instructions: 'Rinse mouth vigorously for 60 seconds; do not eat or drink for 30 minutes after',
      },
    ],
  },
  {
    id: 'pr-demo-02',
    patient_id: 'pat-demo-03',
    doctor_id: 'staff-demo-doc',
    prescription_date: yesterdayStr,
    diagnosis: 'Pre-Implant Surgical Prophylaxis (Penicillin Allergic)',
    notes: 'Patient has documented Penicillin allergy; Azithromycin prescribed as alternative.',
    created_at: yesterdayStr,
    patient: DEMO_PATIENTS[2],
    doctor: DEMO_STAFF_MEMBERS[0],
    items: [
      {
        id: 'pi-demo-04',
        prescription_id: 'pr-demo-02',
        medicine_name: 'Azithromycin (Azomax) 500mg',
        dosage: '1 Capsule',
        frequency: 'Once daily (OD)',
        duration: '3 Days',
        instructions: 'Take 1 hour before meal or 2 hours after meal',
      },
      {
        id: 'pi-demo-05',
        prescription_id: 'pr-demo-02',
        medicine_name: 'Panadol Extra (Paracetamol 500mg + Caffeine)',
        dosage: '2 Tablets',
        frequency: 'Every 6 to 8 hours as needed',
        duration: '3 Days',
        instructions: 'For mild post-operative discomfort',
      },
    ],
  },
];

// ─── DEMO INVENTORY ITEMS ────────────────────────────────────────────
export const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-item-01',
    name: 'Septodont Lignospan 2% Dental Anesthetic Cartridges',
    category: 'Dental Anesthetics',
    sku: 'SKU-LIGNO-01',
    batch_number: 'B2408-091',
    quantity: 4,
    unit: 'boxes',
    min_stock_level: 5, // LOW STOCK TRIGGER!
    cost_price: 3200,
    sale_price: 4500,
    expiry_date: '2027-04-30',
    supplier: 'Septodont Middle East Dist.',
    location: 'Cabinet A - Shelf 1 (Cold storage)',
    notes: 'Lidocaine 2% with Epinephrine 1:100,000. Reorder needed immediately.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'inv-item-02',
    name: '3M Filtek Z350 XT Universal Restorative Composite (A2)',
    category: 'Restorative Materials',
    sku: 'SKU-FLTK-A2',
    batch_number: '3M-99120',
    quantity: 14,
    unit: 'syringes',
    min_stock_level: 4,
    cost_price: 4800,
    sale_price: 6800,
    expiry_date: '2028-02-15',
    supplier: '3M Oral Care Pakistan',
    location: 'Cabinet B - Shelf 2',
    notes: 'Premium nanohybrid aesthetic composite.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'inv-item-03',
    name: 'Kerr OptiBond Universal Dental Adhesive (5ml)',
    category: 'Dental Bonding',
    sku: 'SKU-KERR-BOND',
    batch_number: 'KB-5501',
    quantity: 2,
    unit: 'bottles',
    min_stock_level: 3, // LOW STOCK TRIGGER!
    cost_price: 5200,
    sale_price: 7500,
    expiry_date: '2026-11-30',
    supplier: 'Kerr Dental Supplies',
    location: 'Cabinet B - Shelf 3',
    notes: 'Single component self-etch light cure bonding agent.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'inv-item-04',
    name: 'Medicom Powder-Free Nitrile Examination Gloves (Medium)',
    category: 'PPE & Infection Control',
    sku: 'SKU-GLV-MED-100',
    batch_number: 'MDC-8819',
    quantity: 28,
    unit: 'boxes',
    min_stock_level: 10,
    cost_price: 950,
    sale_price: 1300,
    expiry_date: '2029-08-31',
    supplier: 'Medicom Healthcare',
    location: 'Supply Storage Room 2',
    notes: 'Latex-free, textured fingertips for non-slip grip.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'inv-item-05',
    name: 'Septodont Dental Needles 27G Long (0.4 x 35mm)',
    category: 'Disposables',
    sku: 'SKU-NDL-27G',
    batch_number: 'SPT-449',
    quantity: 3,
    unit: 'boxes',
    min_stock_level: 5, // LOW STOCK TRIGGER!
    cost_price: 1100,
    sale_price: 1600,
    expiry_date: '2028-06-30',
    supplier: 'Septodont Middle East Dist.',
    location: 'Cabinet A - Shelf 2',
    notes: 'Siliconized stainless steel cannulas. Low stock warning active.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
  {
    id: 'inv-item-06',
    name: 'Sterilization Self-Seal Autoclave Pouches 90x230mm',
    category: 'Infection Control',
    sku: 'SKU-PCH-9023',
    batch_number: 'ST-0034',
    quantity: 210,
    unit: 'pouches',
    min_stock_level: 50,
    cost_price: 12,
    sale_price: 25,
    expiry_date: '2030-01-01',
    supplier: 'Medicom Healthcare',
    location: 'Sterilization Room Drawer 1',
    notes: 'Class 4 chemical steam sterilization indicator strips.',
    created_at: lastWeekStr,
    updated_at: todayStr,
  },
];

// ─── DEMO INVOICES ───────────────────────────────────────────────────
export const DEMO_INVOICES: (Invoice & { items: InvoiceItem[] })[] = [
  {
    id: 'inv-demo-01',
    invoice_number: 'INV-2026-001',
    patient_id: 'pat-demo-01',
    doctor_id: 'staff-demo-doc',
    issue_date: todayStr,
    due_date: todayStr,
    subtotal: 21500,
    discount: 0,
    tax: 0,
    total: 21500,
    paid_amount: 21500,
    payment_status: 'paid',
    payment_method: 'card',
    notes: 'Paid in full via Visa debit card. Official clinic tax receipt issued.',
    created_at: todayStr,
    updated_at: todayStr,
    patient: DEMO_PATIENTS[0],
    doctor: DEMO_STAFF_MEMBERS[0],
    items: [
      {
        id: 'ii-demo-01',
        invoice_id: 'inv-demo-01',
        description: 'Root Canal Treatment (RCT - Molar #46)',
        quantity: 1,
        unit_price: 15000,
        total: 15000,
      },
      {
        id: 'ii-demo-02',
        invoice_id: 'inv-demo-01',
        description: 'Post-Endodontic Composite Restoration (#46)',
        quantity: 1,
        unit_price: 6500,
        total: 6500,
      },
    ],
  },
  {
    id: 'inv-demo-02',
    invoice_number: 'INV-2026-002',
    patient_id: 'pat-demo-03',
    doctor_id: 'staff-demo-doc',
    issue_date: yesterdayStr,
    due_date: inFiveDaysStr,
    subtotal: 85000,
    discount: 0,
    tax: 0,
    total: 85000,
    paid_amount: 40000,
    payment_status: 'partial',
    payment_method: 'bank_transfer',
    notes: 'Advance surgical deposit paid (Rs. 40,000). Remaining balance Rs. 45,000 due upon abutment placement.',
    created_at: yesterdayStr,
    updated_at: yesterdayStr,
    patient: DEMO_PATIENTS[2],
    doctor: DEMO_STAFF_MEMBERS[0],
    items: [
      {
        id: 'ii-demo-03',
        invoice_id: 'inv-demo-02',
        description: 'Titanium Dental Implant Fixture & Surgical Placement (#24)',
        quantity: 1,
        unit_price: 85000,
        total: 85000,
      },
    ],
  },
  {
    id: 'inv-demo-03',
    invoice_number: 'INV-2026-003',
    patient_id: 'pat-demo-02',
    doctor_id: 'staff-demo-doc',
    issue_date: lastWeekStr,
    due_date: yesterdayStr,
    subtotal: 18000,
    discount: 0,
    tax: 0,
    total: 18000,
    paid_amount: 0,
    payment_status: 'pending',
    payment_method: 'cash',
    notes: 'Comprehensive Aesthetic Consultation & Diagnostic Mockup. Payment reminder sent via WhatsApp.',
    created_at: lastWeekStr,
    updated_at: lastWeekStr,
    patient: DEMO_PATIENTS[1],
    doctor: DEMO_STAFF_MEMBERS[0],
    items: [
      {
        id: 'ii-demo-04',
        invoice_id: 'inv-demo-03',
        description: 'Digital Smile Design & Diagnostic Wax-Up Mockup',
        quantity: 1,
        unit_price: 18000,
        total: 18000,
      },
    ],
  },
];

// ─── STORAGE KEYS FOR DEMO SANDBOX ───────────────────────────────────
const STORAGE_KEYS = {
  patients: 'dentivista_demo_patients',
  appointments: 'dentivista_demo_appointments',
  invoices: 'dentivista_demo_invoices',
  treatments: 'dentivista_treatments',
  prescriptions: 'dentivista_prescriptions',
  examinations: 'dentivista_examinations',
  inventory: 'dentivista_inventory',
  staff: 'dentivista_demo_staff',
  initialized: 'clinsyst_demo_data_seeded_v2',
};

/**
 * Seeds comprehensive demo data into localStorage when demo account is accessed.
 */
export function seedDemoData(force: boolean = false) {
  if (typeof window === 'undefined') return;

  if (force || !localStorage.getItem(STORAGE_KEYS.initialized)) {
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(DEMO_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(DEMO_APPOINTMENTS));
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(DEMO_INVOICES));
    localStorage.setItem(STORAGE_KEYS.treatments, JSON.stringify(DEMO_TREATMENTS));
    localStorage.setItem(STORAGE_KEYS.prescriptions, JSON.stringify(DEMO_PRESCRIPTIONS));
    localStorage.setItem(STORAGE_KEYS.examinations, JSON.stringify(DEMO_EXAMINATIONS));
    localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(DEMO_INVENTORY));
    localStorage.setItem(STORAGE_KEYS.staff, JSON.stringify(DEMO_STAFF_MEMBERS));
    localStorage.setItem(STORAGE_KEYS.initialized, 'true');
  }
}

/**
 * Safely retrieve demo patients
 */
export function getDemoPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.patients);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_PATIENTS;
}

export function saveDemoPatient(patient: Partial<Patient> & { name: string }): Patient {
  const list = getDemoPatients();
  const existingIdx = list.findIndex(p => p.id === patient.id);
  const nowStr = new Date().toISOString();

  let saved: Patient;
  if (existingIdx >= 0) {
    saved = { ...list[existingIdx], ...patient, updated_at: nowStr };
    list[existingIdx] = saved;
  } else {
    saved = {
      id: patient.id || `pat-demo-${Date.now()}`,
      name: patient.name,
      email: patient.email || null,
      phone: patient.phone || null,
      date_of_birth: patient.date_of_birth || null,
      gender: patient.gender || null,
      blood_group: patient.blood_group || null,
      address: patient.address || null,
      emergency_contact: patient.emergency_contact || null,
      medical_history: patient.medical_history || null,
      notes: patient.notes || null,
      created_at: nowStr,
      updated_at: nowStr,
    };
    list.unshift(saved);
  }

  localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(list));
  return saved;
}

/**
 * Safely retrieve demo appointments
 */
export function getDemoAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.appointments);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_APPOINTMENTS;
}

export function saveDemoAppointment(apt: Partial<Appointment> & { patient_id: string }): Appointment {
  const list = getDemoAppointments();
  const patients = getDemoPatients();
  const staff = DEMO_STAFF_MEMBERS;
  const existingIdx = list.findIndex(a => a.id === apt.id);
  const nowStr = new Date().toISOString();

  const patient = patients.find(p => p.id === apt.patient_id);
  const doctor = staff.find(s => s.id === apt.doctor_id);

  let saved: Appointment;
  if (existingIdx >= 0) {
    saved = {
      ...list[existingIdx],
      ...apt,
      patient: patient || list[existingIdx].patient,
      doctor: doctor || list[existingIdx].doctor,
      updated_at: nowStr,
    };
    list[existingIdx] = saved;
  } else {
    saved = {
      id: apt.id || `apt-demo-${Date.now()}`,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id || staff[0].id,
      appointment_date: apt.appointment_date || todayStr,
      appointment_time: apt.appointment_time || '10:00',
      duration_minutes: apt.duration_minutes || 30,
      status: apt.status || 'scheduled',
      procedure: apt.procedure || 'Dental Checkup',
      notes: apt.notes || null,
      created_at: nowStr,
      updated_at: nowStr,
      patient,
      doctor,
    };
    list.unshift(saved);
  }

  localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(list));
  return saved;
}

export function updateDemoAppointmentStatus(id: string, status: any): boolean {
  const list = getDemoAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(list));
    return true;
  }
  return false;
}

/**
 * Safely retrieve demo invoices
 */
export function getDemoInvoices(): (Invoice & { items: InvoiceItem[] })[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.invoices);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_INVOICES;
}

export function saveDemoInvoice(
  inv: Partial<Invoice> & { patient_id: string; total: number; items?: Partial<InvoiceItem>[] }
): Invoice & { items: InvoiceItem[] } {
  const list = getDemoInvoices();
  const patients = getDemoPatients();
  const staff = DEMO_STAFF_MEMBERS;
  const existingIdx = list.findIndex(i => i.id === inv.id);
  const nowStr = new Date().toISOString();

  const patient = patients.find(p => p.id === inv.patient_id);
  const doctor = staff.find(s => s.id === inv.doctor_id);

  const invoiceId = inv.id || `inv-demo-${Date.now()}`;
  const mappedItems: InvoiceItem[] = (inv.items || []).map((it, idx) => ({
    id: it.id || `ii-demo-${Date.now()}-${idx}`,
    invoice_id: invoiceId,
    description: it.description || 'Treatment Service',
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.unit_price) || 0,
    total: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
  }));

  let saved: Invoice & { items: InvoiceItem[] };
  if (existingIdx >= 0) {
    saved = {
      ...list[existingIdx],
      ...inv,
      items: mappedItems.length > 0 ? mappedItems : list[existingIdx].items,
      patient: patient || list[existingIdx].patient,
      doctor: doctor || list[existingIdx].doctor,
      updated_at: nowStr,
    };
    list[existingIdx] = saved;
  } else {
    saved = {
      id: invoiceId,
      invoice_number: inv.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      patient_id: inv.patient_id,
      doctor_id: inv.doctor_id || staff[0].id,
      issue_date: inv.issue_date || todayStr,
      due_date: inv.due_date || todayStr,
      subtotal: Number(inv.subtotal) || Number(inv.total) || 0,
      discount: Number(inv.discount) || 0,
      tax: Number(inv.tax) || 0,
      total: Number(inv.total) || 0,
      paid_amount: Number(inv.paid_amount) || 0,
      payment_status: inv.payment_status || 'pending',
      payment_method: inv.payment_method || 'cash',
      notes: inv.notes || null,
      created_at: nowStr,
      updated_at: nowStr,
      patient,
      doctor,
      items: mappedItems,
    };
    list.unshift(saved);
  }

  localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(list));
  return saved;
}

export function updateDemoInvoicePayment(id: string, paidAmount: number, paymentMethod?: string): boolean {
  const list = getDemoInvoices();
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) {
    const inv = list[idx];
    const newPaid = Number(paidAmount);
    inv.paid_amount = newPaid;
    if (newPaid >= inv.total) {
      inv.payment_status = 'paid';
    } else if (newPaid > 0) {
      inv.payment_status = 'partial';
    } else {
      inv.payment_status = 'pending';
    }
    if (paymentMethod) inv.payment_method = paymentMethod;
    inv.updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(list));
    return true;
  }
  return false;
}

export function getDemoInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.inventory);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_INVENTORY;
}

export function getDemoExaminations(): Examination[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.examinations);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_EXAMINATIONS;
}

export function getDemoTreatments(): Treatment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.treatments);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_TREATMENTS;
}

export function getDemoPrescriptions(): (Prescription & { items: PrescriptionItem[] })[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prescriptions);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_PRESCRIPTIONS;
}

