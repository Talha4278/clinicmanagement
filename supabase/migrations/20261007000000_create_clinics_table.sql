/*
# Dentivista Dental & Aesthetics — Complete Unified Schema & Multi-Tenancy Migration

## Summary
1. Creates the `clinics` master table for multi-tenant clinic accounts.
2. Creates and verifies all clinical, billing, and operational tables:
   - `staff` (Team members & roles)
   - `patients` (Patient profiles & medical records)
   - `appointments` (Patient schedule & bookings)
   - `invoices` (Billing & payment headers)
   - `invoice_items` (Invoice line items)
   - `inventory_items` (Clinic stock, materials & pharmaceuticals)
   - `examinations` (Dental examination & odontogram / dental chart)
   - `treatments` (Procedures, dental treatments & tracking)
   - `prescriptions` (Prescriptions issued by doctors)
   - `prescription_items` (Medication dosages, frequency & instructions)
3. Enforces `clinic_id text REFERENCES clinics(id) ON DELETE CASCADE` across all tables.
4. Backfills all legacy unassigned rows to the default clinic: 'clinic-dentivista-01'.
5. Configures Row-Level Security (RLS) policies and performance indexes.
*/

-- ─── 0. EXTENSIONS & COMMON ENUMS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE clinic_status AS ENUM ('trial', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'receptionist', 'doctor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('consultation', 'lab', 'medicine', 'procedure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 1. MASTER CLINICS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'pro',
  max_seats integer NOT NULL DEFAULT 5,
  max_concurrent_sessions integer NOT NULL DEFAULT 5,
  owner_name text NOT NULL,
  owner_email text NOT NULL,
  phone text,
  address text,
  tagline text,
  logo_url text,
  status clinic_status NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinics_slug ON public.clinics (slug);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics (status);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinics_allow_all" ON public.clinics;
CREATE POLICY "clinics_allow_all" ON public.clinics FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Seed default clinic
INSERT INTO public.clinics (id, name, slug, plan, max_seats, max_concurrent_sessions, owner_name, owner_email, phone, address, tagline, status, trial_ends_at)
VALUES (
  'clinic-dentivista-01',
  'Dentivista Dental & Aesthetics',
  'dentivista',
  'pro',
  5,
  5,
  'Dr. Sarah Tariq',
  'sarah@dentivista.com',
  '(+92) 300-0979185',
  '1st Floor, 6/Street 2, Down Town Royal Orchard, Multan',
  'Dental & Aesthetics',
  'active',
  now() + interval '365 days'
) ON CONFLICT (id) DO NOTHING;

-- ─── 2. STAFF TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  role staff_role NOT NULL DEFAULT 'receptionist',
  email text NOT NULL,
  phone text,
  specialization text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_staff_clinic_id ON public.staff (clinic_id);
UPDATE public.staff SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 3. PATIENTS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date,
  gender gender_type,
  blood_group text,
  address text,
  emergency_contact text,
  medical_history text,
  allergies text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients (clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);
UPDATE public.patients SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 4. APPOINTMENTS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  appointment_date date NOT NULL DEFAULT CURRENT_DATE,
  appointment_time text NOT NULL DEFAULT '09:00',
  duration_minutes integer DEFAULT 30,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  procedure text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (appointment_date);
UPDATE public.appointments SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 5. INVOICES & INVOICE_ITEMS TABLES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_type discount_type NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON public.invoices (clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (payment_status);
UPDATE public.invoices SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type item_type NOT NULL DEFAULT 'procedure',
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

-- ─── 6. INVENTORY ITEMS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Dental Materials',
  sku text NOT NULL,
  batch_number text,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  min_stock_level numeric(10,2) NOT NULL DEFAULT 5,
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  expiry_date date,
  supplier text,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_inventory_items_clinic_id ON public.inventory_items (clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items (sku);
UPDATE public.inventory_items SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 7. EXAMINATIONS TABLE (DENTAL CHART & ODONTOGRAM) ────────────────────────
CREATE TABLE IF NOT EXISTS public.examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  examination_date date NOT NULL DEFAULT CURRENT_DATE,
  dentition_type text NOT NULL DEFAULT 'adult',
  chief_complaint text,
  gingival_condition text,
  plaque_level text,
  soft_tissue_notes text,
  teeth_findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_notes text,
  treatment_plan_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examinations ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_examinations_clinic_id ON public.examinations (clinic_id);
CREATE INDEX IF NOT EXISTS idx_examinations_patient_id ON public.examinations (patient_id);
CREATE INDEX IF NOT EXISTS idx_examinations_date ON public.examinations (examination_date);
UPDATE public.examinations SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 8. TREATMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  treatment_date date NOT NULL DEFAULT CURRENT_DATE,
  tooth_number text,
  procedure_name text NOT NULL,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_treatments_clinic_id ON public.treatments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON public.treatments (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON public.treatments (status);
UPDATE public.treatments SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 9. PRESCRIPTIONS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  prescription_date date NOT NULL DEFAULT CURRENT_DATE,
  diagnosis text,
  clinical_notes text,
  advice text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES public.clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id ON public.prescriptions (clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions (prescription_date);
UPDATE public.prescriptions SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- ─── 10. PRESCRIPTION ITEMS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text,
  quantity text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items (prescription_id);

-- ─── 11. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES ─────────────────────
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'clinics',
    'staff',
    'patients',
    'appointments',
    'invoices',
    'invoice_items',
    'inventory_items',
    'examinations',
    'treatments',
    'prescriptions',
    'prescription_items'
  ]) LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_policy_all', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);', tbl || '_policy_all', tbl);
    END IF;
  END LOOP;
END $$;
