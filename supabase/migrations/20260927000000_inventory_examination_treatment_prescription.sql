/*
# Dentivista Dental & Aesthetics — Inventory, Examination & Dental Chart, Treatment & Prescriptions Schema

## Summary
Creates tables for:
- inventory_items (Clinic stock & supply management)
- examinations (Dental examinations, adult & child dentition charts, findings per tooth)
- treatments (Treatment plans & procedures performed)
- prescriptions & prescription_items (Prescriptions issued to patients)
*/

-- ─── INVENTORY ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Dental Materials',
  sku text NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items (category);
CREATE INDEX IF NOT EXISTS inventory_items_sku_idx ON inventory_items (sku);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_select" ON inventory_items;
CREATE POLICY "inventory_select" ON inventory_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inventory_insert" ON inventory_items;
CREATE POLICY "inventory_insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_update" ON inventory_items;
CREATE POLICY "inventory_update" ON inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_delete" ON inventory_items;
CREATE POLICY "inventory_delete" ON inventory_items FOR DELETE TO authenticated USING (true);

-- ─── EXAMINATIONS (DENTAL CHART & CLINICAL EXAM) ───────────────────────────
CREATE TABLE IF NOT EXISTS examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES staff(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS examinations_patient_idx ON examinations (patient_id);
CREATE INDEX IF NOT EXISTS examinations_date_idx ON examinations (examination_date);

ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examinations_select" ON examinations;
CREATE POLICY "examinations_select" ON examinations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "examinations_insert" ON examinations;
CREATE POLICY "examinations_insert" ON examinations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "examinations_update" ON examinations;
CREATE POLICY "examinations_update" ON examinations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "examinations_delete" ON examinations;
CREATE POLICY "examinations_delete" ON examinations FOR DELETE TO authenticated USING (true);

-- ─── TREATMENTS ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE treatment_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  treatment_date date NOT NULL DEFAULT CURRENT_DATE,
  tooth_number text,
  procedure_name text NOT NULL,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treatments_patient_idx ON treatments (patient_id);
CREATE INDEX IF NOT EXISTS treatments_status_idx ON treatments (status);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "treatments_select" ON treatments;
CREATE POLICY "treatments_select" ON treatments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "treatments_insert" ON treatments;
CREATE POLICY "treatments_insert" ON treatments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "treatments_update" ON treatments;
CREATE POLICY "treatments_update" ON treatments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "treatments_delete" ON treatments;
CREATE POLICY "treatments_delete" ON treatments FOR DELETE TO authenticated USING (true);

-- ─── PRESCRIPTIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  prescription_date date NOT NULL DEFAULT CURRENT_DATE,
  diagnosis text,
  clinical_notes text,
  advice text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescriptions_patient_idx ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS prescriptions_date_idx ON prescriptions (prescription_date);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_select" ON prescriptions;
CREATE POLICY "prescriptions_select" ON prescriptions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
CREATE POLICY "prescriptions_insert" ON prescriptions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
CREATE POLICY "prescriptions_update" ON prescriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prescriptions_delete" ON prescriptions;
CREATE POLICY "prescriptions_delete" ON prescriptions FOR DELETE TO authenticated USING (true);

-- ─── PRESCRIPTION ITEMS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text,
  quantity text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescription_items_prescription_idx ON prescription_items (prescription_id);

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescription_items_select" ON prescription_items;
CREATE POLICY "prescription_items_select" ON prescription_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "prescription_items_insert" ON prescription_items;
CREATE POLICY "prescription_items_insert" ON prescription_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prescription_items_update" ON prescription_items;
CREATE POLICY "prescription_items_update" ON prescription_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prescription_items_delete" ON prescription_items;
CREATE POLICY "prescription_items_delete" ON prescription_items FOR DELETE TO authenticated USING (true);
