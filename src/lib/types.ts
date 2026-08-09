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

