/*
# Tighten RLS Policies — Replace "always true" predicates with real ownership checks

## Problem
All write/delete policies were using USING (true) / WITH CHECK (true), which grants unrestricted
access to any authenticated user — including accounts that are not legitimate clinic staff.

## Solution
1. Create two SECURITY DEFINER helper functions that bypass RLS internally:
   - is_active_staff(): true when auth.uid() belongs to an active staff member
   - is_admin_staff(): true when auth.uid() belongs to an active admin staff member

2. Replace all "always true" clauses:
   - SELECT/INSERT/UPDATE on clinic data → require is_active_staff()
   - DELETE on shared data (patients, invoices, items) → require is_admin_staff()
   - staff INSERT → only allow inserting your own record (auth.uid() = user_id)
   - staff UPDATE → own record or admin
   - staff DELETE → admin only, cannot self-delete

## Security changes per table

### staff
  - SELECT: any active staff member
  - INSERT: only insert row where user_id = auth.uid() (self-registration on signup)
  - UPDATE: admin can update anyone; staff can update their own row
  - DELETE: admin only, cannot delete own account

### patients
  - SELECT/INSERT/UPDATE: any active staff member
  - DELETE: admin only

### invoices
  - SELECT/INSERT/UPDATE: any active staff member
  - DELETE: admin only

### invoice_items
  - SELECT/INSERT/UPDATE: any active staff member
  - DELETE: any active staff member (items are internal to invoices)

## Important notes
  - Functions use SECURITY DEFINER so they run as owner and bypass RLS when checking staff
    membership — this avoids circular dependency (staff SELECT policy calling a function
    that itself needs to SELECT from staff under RLS).
  - SET search_path = public prevents search_path injection attacks.
*/

-- ─── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_active_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
      AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_admin_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND active = true
  );
$$;

-- ─── STAFF policies ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "staff_select" ON staff;
CREATE POLICY "staff_select" ON staff
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Only allow a user to insert a staff row tied to their own auth.uid (signup flow)
DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can update anyone; staff can update only their own row
DROP POLICY IF EXISTS "staff_update" ON staff;
CREATE POLICY "staff_update" ON staff
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_admin_staff())
  WITH CHECK (auth.uid() = user_id OR is_admin_staff());

-- Admin only; cannot delete own account
DROP POLICY IF EXISTS "staff_delete" ON staff;
CREATE POLICY "staff_delete" ON staff
  FOR DELETE TO authenticated
  USING (is_admin_staff() AND user_id != auth.uid());

-- ─── PATIENTS policies ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select" ON patients
  FOR SELECT TO authenticated
  USING (is_active_staff());

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients
  FOR UPDATE TO authenticated
  USING (is_active_staff())
  WITH CHECK (is_active_staff());

-- Only admins can permanently delete patient records
DROP POLICY IF EXISTS "patients_delete" ON patients;
CREATE POLICY "patients_delete" ON patients
  FOR DELETE TO authenticated
  USING (is_admin_staff());

-- ─── INVOICES policies ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO authenticated
  USING (is_active_staff());

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE TO authenticated
  USING (is_active_staff())
  WITH CHECK (is_active_staff());

-- Only admins can delete invoices
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE TO authenticated
  USING (is_admin_staff());

-- ─── INVOICE ITEMS policies ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "invoice_items_select" ON invoice_items;
CREATE POLICY "invoice_items_select" ON invoice_items
  FOR SELECT TO authenticated
  USING (is_active_staff());

DROP POLICY IF EXISTS "invoice_items_insert" ON invoice_items;
CREATE POLICY "invoice_items_insert" ON invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "invoice_items_update" ON invoice_items;
CREATE POLICY "invoice_items_update" ON invoice_items
  FOR UPDATE TO authenticated
  USING (is_active_staff())
  WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "invoice_items_delete" ON invoice_items;
CREATE POLICY "invoice_items_delete" ON invoice_items
  FOR DELETE TO authenticated
  USING (is_active_staff());
