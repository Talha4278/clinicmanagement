/*
# Dentivista Dental & Aesthetics — Clinic Management System (Initial Schema)

## Summary
Creates the full database schema for a dental clinic management system with patient records,
staff/roles, billing, invoices, and supporting data.

## New Tables

### staff
Stores clinic staff members linked to Supabase auth users.
- id: uuid primary key
- user_id: references auth.users (one-to-one)
- name: full name
- role: enum (admin, receptionist, doctor)
- email, phone, specialization, active, created_at

### patients
Stores patient demographic and medical info.
- id, name, phone, email, date_of_birth, gender, address, medical_history, allergies, created_at

### invoices
Top-level billing record per visit/session.
- id, invoice_number (auto-generated), patient_id, doctor_id (staff), created_by (staff)
- subtotal, discount_type (percentage|fixed), discount_value, discount_amount
- tax_rate, tax_amount, total
- payment_method (cash|card|bank_transfer), payment_status (paid|pending|partial)
- notes, created_at

### invoice_items
Line items on an invoice.
- id, invoice_id, item_type (consultation|lab|medicine|procedure)
- description, quantity, unit_price, total

## Security
- RLS enabled on all tables.
- authenticated users can read/write all records (staff-only app — any authenticated user is clinic staff).
- anon denied access to all tables.

## Notes
- invoice_number generated via a sequence starting at INV-0001 format.
- All monetary values stored as numeric(10,2).
*/

-- Staff roles enum
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'receptionist', 'doctor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Discount type enum
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Item type enum
DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('consultation', 'lab', 'medicine', 'procedure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gender enum
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- ─── STAFF ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role staff_role NOT NULL DEFAULT 'receptionist',
  email text NOT NULL,
  phone text,
  specialization text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select" ON staff;
CREATE POLICY "staff_select" ON staff FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update" ON staff;
CREATE POLICY "staff_update" ON staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete" ON staff;
CREATE POLICY "staff_delete" ON staff FOR DELETE TO authenticated USING (true);

-- ─── PATIENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date,
  gender gender_type,
  address text,
  medical_history text,
  allergies text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patients_name_idx ON patients USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients (phone);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "patients_delete" ON patients;
CREATE POLICY "patients_delete" ON patients FOR DELETE TO authenticated USING (true);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT ('INV-' || LPAD(nextval('invoice_number_seq')::text, 4, '0')),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_type discount_type DEFAULT 'fixed',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_patient_idx ON invoices (patient_id);
CREATE INDEX IF NOT EXISTS invoices_doctor_idx ON invoices (doctor_id);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (payment_status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (true);

-- ─── INVOICE ITEMS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type item_type NOT NULL DEFAULT 'consultation',
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items (invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_items_select" ON invoice_items;
CREATE POLICY "invoice_items_select" ON invoice_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invoice_items_insert" ON invoice_items;
CREATE POLICY "invoice_items_insert" ON invoice_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invoice_items_update" ON invoice_items;
CREATE POLICY "invoice_items_update" ON invoice_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoice_items_delete" ON invoice_items;
CREATE POLICY "invoice_items_delete" ON invoice_items FOR DELETE TO authenticated USING (true);
