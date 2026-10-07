/*
# Dentivista Dental & Aesthetics — Multi-Tenant Clinics & Subscriptions Schema

## Summary
Creates the `clinics` table to track clinic tenant accounts, subscription tiers, seat limits,
and membership access status (`status` column).
Also automatically triggers entries into `clinics` and `staff` upon clinic signup and staff addition.

## Tables & Relationships

### clinics
Stores multi-tenant clinic profiles and subscription metadata.
- id: text primary key (e.g. 'clinic-dentivista-01')
- name: text clinic name
- slug: text unique url slug
- plan: subscription tier ('starter', 'pro', 'enterprise')
- max_seats: integer max staff accounts allowed
- max_concurrent_sessions: integer max simultaneous logins allowed
- owner_name: text clinic owner / primary doctor
- owner_email: text owner email
- phone, address, tagline, logo_url: text
- status: enum ('trial', 'active', 'suspended') -- Membership status
- trial_ends_at: timestamptz
- created_at: timestamptz

### staff.clinic_id
Foreign key referencing `clinics(id)` to scope each staff member strictly to their clinic.

## Automation Trigger: handle_new_clinic_signup
When a user registers (or when an admin registers a staff account), this trigger automatically:
1. Creates the clinic row in `clinics` with the actual clinic data if not already present.
2. Creates the staff row in `staff` with the designated role ('admin' on clinic signup, or 'doctor'/'receptionist' when admin adds staff).
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

-- ─── LINK STAFF TABLE TO CLINICS (RELATIONSHIP) ──────────────────────────────
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS staff_clinic_id_idx ON staff (clinic_id);

-- Backfill existing staff records with default clinic ID
UPDATE staff 
SET clinic_id = 'clinic-dentivista-01' 
WHERE clinic_id IS NULL;

-- Ensure staff insert policy allows signup self-registration and admin creation
DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

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
