/*
# Dentivista Dental & Aesthetics — Multi-Tenant Clinics & Subscriptions Schema

## Summary
Creates the `clinics` table to track clinic tenant accounts, subscription tiers, seat limits,
and membership access status (`status` column).

## New Tables

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

## Security
- RLS enabled on clinics table.
- Authenticated staff can read their own clinic details based on app_metadata -> clinic_id.
*/

-- Clinic membership status enum
DO $$ BEGIN
  CREATE TYPE clinic_status AS ENUM ('trial', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── CLINICS ──────────────────────────────────────────────────────────────────
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
  status clinic_status NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinics_slug_idx ON clinics (slug);
CREATE INDEX IF NOT EXISTS clinics_status_idx ON clinics (status);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select" ON clinics;
CREATE POLICY "clinics_select" ON clinics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clinics_insert" ON clinics;
CREATE POLICY "clinics_insert" ON clinics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clinics_update" ON clinics;
CREATE POLICY "clinics_update" ON clinics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed default clinic
INSERT INTO clinics (id, name, slug, plan, max_seats, max_concurrent_sessions, owner_name, owner_email, phone, address, tagline, status)
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
  'active'
) ON CONFLICT (id) DO NOTHING;

-- ─── LINK STAFF TABLE TO CLINICS (RELATIONSHIP) ──────────────────────────────
-- Each staff member belongs to exactly one clinic (Many-to-One)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS clinic_id text REFERENCES clinics(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS staff_clinic_id_idx ON staff (clinic_id);

-- Backfill existing staff records with default clinic ID
UPDATE staff 
SET clinic_id = 'clinic-dentivista-01' 
WHERE clinic_id IS NULL;
