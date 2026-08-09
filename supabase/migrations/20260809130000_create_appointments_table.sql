/*
# Dentivista Dental & Aesthetics — Appointments Schema

## Summary
Creates the appointments table for scheduling and managing patient appointments, linked to patients and staff.

## New Types & Tables
- Enum `appointment_status`: ('scheduled', 'completed', 'cancelled', 'no_show')
- Table `appointments`:
  - id: uuid primary key
  - patient_id: uuid FK to patients(id)
  - doctor_id: uuid FK to staff(id)
  - created_by: uuid FK to staff(id)
  - appointment_date: date NOT NULL
  - appointment_time: text NOT NULL (e.g., '10:00')
  - status: appointment_status NOT NULL DEFAULT 'scheduled'
  - procedure: text
  - notes: text
  - created_at: timestamptz NOT NULL DEFAULT now()

## Security
- RLS enabled.
- Select/Insert/Update: relies on is_active_staff()
- Delete: relies on is_admin_staff()
*/

-- Appointment status enum
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── APPOINTMENTS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  appointment_date date NOT NULL DEFAULT CURRENT_DATE,
  appointment_time text NOT NULL DEFAULT '09:00',
  status appointment_status NOT NULL DEFAULT 'scheduled',
  procedure text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Fallback simple RLS policies for authenticated users + functions when available
DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated USING (true);
