export type StaffRole = 'admin' | 'receptionist' | 'doctor';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer';
export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type DiscountType = 'percentage' | 'fixed';
export type ItemType = 'consultation' | 'lab' | 'medicine' | 'procedure';
export type GenderType = 'male' | 'female' | 'other';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';


export interface Staff {
  id: string;
  user_id: string | null;
  name: string;
  role: StaffRole;
  email: string;
  phone: string | null;
  specialization: string | null;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: GenderType | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: ItemType;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  doctor_id: string | null;
  created_by: string | null;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Staff;
  creator?: Staff;
  invoice_items?: InvoiceItem[];
}

export interface DashboardStats {
  totalPatients: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingPayments: number;
  todayInvoices: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  created_by: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  procedure: string | null;
  notes: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Staff;
  creator?: Staff;
}

// ─── INVENTORY MODULE TYPES ──────────────────────────────────────────
export type InventoryCategory =
  | 'Dental Materials'
  | 'Pharmaceuticals'
  | 'Disposables & Surgical'
  | 'Instruments & Tools'
  | 'Office & General';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  sku: string;
  batch_number?: string | null;
  quantity: number;
  unit: string; // e.g. 'pcs', 'boxes', 'bottles', 'tubes', 'packs', 'ampoules'
  min_stock_level: number;
  cost_price: number;
  sale_price?: number | null;
  expiry_date?: string | null;
  supplier?: string | null;
  location?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── DENTAL CHART & EXAMINATION TYPES ────────────────────────────────
export type DentitionType = 'adult' | 'child';

export type ToothFinding =
  | 'sound'        // Healthy / Sound
  | 'caries'       // Dental Caries / Decay
  | 'filling'      // Filling / Composite / Amalgam
  | 'rct'          // Root Canal Treated
  | 'crown'        // Crown / Cap
  | 'extraction'   // Indicated for Extraction
  | 'implant'      // Dental Implant
  | 'missing';     // Missing Tooth

export type ToothSurface = 'O' | 'M' | 'D' | 'B' | 'L'; // Occlusal, Mesial, Distal, Buccal, Lingual

export interface ToothCondition {
  findings: ToothFinding[];
  surfaces?: ToothSurface[];
  notes?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface Examination {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  examination_date: string;
  dentition_type: DentitionType;
  chief_complaint?: string | null;
  gingival_condition?: 'Healthy' | 'Mild Gingivitis' | 'Moderate Periodontitis' | 'Severe Periodontitis' | null;
  plaque_level?: 'Low' | 'Moderate' | 'High' | null;
  soft_tissue_notes?: string | null;
  teeth_findings: Record<number, ToothCondition>;
  clinical_notes?: string | null;
  treatment_plan_notes?: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Staff;
}

// ─── TREATMENT MODULE TYPES ──────────────────────────────────────────
export type TreatmentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Treatment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  treatment_date: string;
  tooth_number?: string | null; // e.g., "44", "16", "Full Mouth"
  procedure_name: string;
  cost: number;
  status: TreatmentStatus;
  notes?: string | null;
  invoice_id?: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Staff;
}

// ─── PRESCRIPTION MODULE TYPES ───────────────────────────────────────
export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string; // e.g., "500 mg", "1 tablet", "10 ml"
  frequency: string; // e.g., "1-0-1", "TDS (3 times/day)", "BD (Twice/day)", "OD (Once/day)", "SOS (As needed)"
  duration: string; // e.g., "5 days", "7 days"
  instructions: string; // e.g., "After meals", "Before bed", "With full glass of water"
  quantity?: string; // e.g., "15 tabs"
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  prescription_date: string;
  diagnosis?: string | null;
  clinical_notes?: string | null;
  advice?: string | null; // e.g. "Warm saline rinse 3 times daily, avoid hard food"
  follow_up_date?: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Staff;
  items?: PrescriptionItem[];
}

// ─── PATIENT RESEARCH & TIMELINE DOSSIER ─────────────────────────────
export type PatientActivityType = 'appointment' | 'examination' | 'treatment' | 'prescription' | 'invoice';

export interface PatientActivityEvent {
  id: string;
  type: PatientActivityType;
  date: string;
  title: string;
  subtitle?: string;
  details?: string;
  status?: string;
  doctorName?: string;
  badgeColor?: string;
  rawRecord: any;
}

// ─── CLINIC SETUP & SETTINGS ─────────────────────────────────────────
export type WhatsAppProvider = 'direct_web' | 'cloud_api' | 'twilio' | 'ultramsg';

export interface WhatsAppConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  business_number?: string;
  api_endpoint?: string;
  api_key?: string;
  phone_number_id?: string;
  account_sid?: string;
  webhook_url?: string;
  auto_remind_hours_before?: number;
}

export interface ClinicSettings {
  clinic_name: string;
  tagline: string;
  logo_url?: string | null;
  address: string;
  email: string;
  phone: string;
  website?: string | null;
  tax_number?: string | null;
  currency_symbol?: string;
  whatsapp_config?: WhatsAppConfig;
}



