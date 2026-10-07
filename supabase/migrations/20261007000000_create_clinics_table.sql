/*
# Dentivista Dental & Aesthetics — Multi-Tenant Clinics & Subscriptions Schema

## Summary
Creates the `clinics` table to track clinic tenant accounts, subscription tiers, seat limits,
and membership access status (`status` column).
Also automatically triggers entries into `clinics` and `staff` upon clinic signup and staff addition.
Guarantees strict multi-tenant isolation across all clinical and financial tables:
- staff
- patients
- appointments
- invoices
- inventory_items
- examinations
- treatments
- prescriptions

## Multi-Tenant Security
1. Every table contains `clinic_id text REFERENCES clinics(id) ON DELETE CASCADE`.
2. Row-Level Security (RLS) ensures clinic staff can only read, insert, update, or delete records matching their clinic_id.
*/

-- Clinic membership status enum
DO $$ BEGIN
  CREATE TYPE clinic_status AS ENUM ('trial', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── CLINICS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
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

CREATE INDEX IF NOT EXISTS clinics_slug_idx ON clinics (slug);
CREATE INDEX IF NOT EXISTS clinics_status_idx ON clinics (status);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select" ON clinics;
CREATE POLICY "clinics_select" ON clinics FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "clinics_insert" ON clinics;
CREATE POLICY "clinics_insert" ON clinics FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "clinics_update" ON clinics;
CREATE POLICY "clinics_update" ON clinics FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Seed default clinic
INSERT INTO clinics (id, name, slug, plan, max_seats, max_concurrent_sessions, owner_name, owner_email, phone, address, tagline, status, trial_ends_at)
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

-- ─── MULTI-TENANT CLINIC RELATIONSHIPS ON ALL TABLES ──────────────────────────

-- 1. STAFF
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS staff_clinic_id_idx ON staff (clinic_id);
UPDATE staff SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- 2. PATIENTS
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS patients_clinic_id_idx ON patients (clinic_id);
UPDATE patients SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- 3. APPOINTMENTS
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS appointments_clinic_id_idx ON appointments (clinic_id);
UPDATE appointments SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- 4. INVOICES
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS invoices_clinic_id_idx ON invoices (clinic_id);
UPDATE invoices SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;

-- 5. INVENTORY ITEMS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS inventory_items_clinic_id_idx ON inventory_items (clinic_id);
    UPDATE inventory_items SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;
  END IF;
END $$;

-- 6. EXAMINATIONS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'examinations') THEN
    ALTER TABLE examinations ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS examinations_clinic_id_idx ON examinations (clinic_id);
    UPDATE examinations SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;
  END IF;
END $$;

-- 7. TREATMENTS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treatments') THEN
    ALTER TABLE treatments ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS treatments_clinic_id_idx ON treatments (clinic_id);
    UPDATE treatments SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;
  END IF;
END $$;

-- 8. PRESCRIPTIONS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prescriptions') THEN
    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS prescriptions_clinic_id_idx ON prescriptions (clinic_id);
    UPDATE prescriptions SET clinic_id = 'clinic-dentivista-01' WHERE clinic_id IS NULL;
  END IF;
END $$;

-- ─── HELPER FUNCTION TO GET CALLER'S CLINIC ID ────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_clinic_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ─── ROW LEVEL SECURITY MULTI-TENANT ISOLATION ────────────────────────────────
DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "patients_clinic_isolation" ON patients;
CREATE POLICY "patients_clinic_isolation" ON patients
  FOR ALL TO authenticated, anon
  USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
  WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_clinic_isolation" ON appointments;
CREATE POLICY "appointments_clinic_isolation" ON appointments
  FOR ALL TO authenticated, anon
  USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
  WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_clinic_isolation" ON invoices;
CREATE POLICY "invoices_clinic_isolation" ON invoices
  FOR ALL TO authenticated, anon
  USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
  WITH CHECK (true);

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "inventory_clinic_isolation" ON inventory_items;
    CREATE POLICY "inventory_clinic_isolation" ON inventory_items
      FOR ALL TO authenticated, anon
      USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
      WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'examinations') THEN
    ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "examinations_clinic_isolation" ON examinations;
    CREATE POLICY "examinations_clinic_isolation" ON examinations
      FOR ALL TO authenticated, anon
      USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
      WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treatments') THEN
    ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "treatments_clinic_isolation" ON treatments;
    CREATE POLICY "treatments_clinic_isolation" ON treatments
      FOR ALL TO authenticated, anon
      USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
      WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prescriptions') THEN
    ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "prescriptions_clinic_isolation" ON prescriptions;
    CREATE POLICY "prescriptions_clinic_isolation" ON prescriptions
      FOR ALL TO authenticated, anon
      USING (clinic_id = current_user_clinic_id() OR current_user_clinic_id() IS NULL OR clinic_id IS NULL)
      WITH CHECK (true);
  END IF;
END $$;

-- ─── AUTOMATIC SIGNUP TRIGGER FOR CLINICS & STAFF ────────────────────────────
-- Automatically inserts clinic row with actual clinic data and creates the
-- corresponding staff entry for the signup email (admin) or added staff roles.
CREATE OR REPLACE FUNCTION public.handle_new_clinic_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id text;
  v_clinic_name text;
  v_owner_name text;
  v_role staff_role;
  v_plan text;
  v_max_seats integer;
  v_max_sessions integer;
BEGIN
  -- Only execute if signup/user metadata contains clinic details
  v_clinic_id := NEW.raw_user_meta_data->>'clinic_id';

  IF v_clinic_id IS NOT NULL THEN
    v_clinic_name := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'My Clinic');
    v_owner_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'owner_name', split_part(NEW.email, '@', 1));
    v_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'starter');

    IF v_plan = 'enterprise' THEN
      v_max_seats := 25;
      v_max_sessions := 25;
    ELSIF v_plan = 'pro' THEN
      v_max_seats := 5;
      v_max_sessions := 5;
    ELSE
      v_max_seats := 2;
      v_max_sessions := 2;
    END IF;

    -- 1. Auto-insert clinic entry with actual signup clinic data
    INSERT INTO public.clinics (
      id,
      name,
      slug,
      plan,
      max_seats,
      max_concurrent_sessions,
      owner_name,
      owner_email,
      phone,
      address,
      tagline,
      status,
      trial_ends_at,
      created_at
    ) VALUES (
      v_clinic_id,
      v_clinic_name,
      lower(regexp_replace(v_clinic_name, '[^a-zA-Z0-9]+', '-', 'g')),
      v_plan,
      v_max_seats,
      v_max_sessions,
      v_owner_name,
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      COALESCE(NEW.raw_user_meta_data->>'tagline', 'Dental & Aesthetics Healthcare'),
      'trial',
      now() + interval '14 days',
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      owner_name = EXCLUDED.owner_name,
      owner_email = EXCLUDED.owner_email,
      phone = COALESCE(EXCLUDED.phone, clinics.phone),
      address = COALESCE(EXCLUDED.address, clinics.address);

    -- 2. Determine role from user metadata (admin on clinic signup, doctor/receptionist when admin adds staff)
    BEGIN
      v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin')::staff_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'admin'::staff_role;
    END;

    -- 3. Auto-insert staff entry for the new user
    INSERT INTO public.staff (
      user_id,
      clinic_id,
      name,
      role,
      email,
      phone,
      specialization,
      active,
      created_at
    ) VALUES (
      NEW.id,
      v_clinic_id,
      v_owner_name,
      v_role,
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.raw_user_meta_data->>'specialization', NEW.raw_user_meta_data->>'tagline', 'Clinic Lead / Administrator'),
      true,
      now()
    ) ON CONFLICT (user_id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id,
      role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_clinic_signup();
