/*
# Allow admins to create staff members for other users

## Problem
staff_insert only allowed auth.uid() = user_id (self-registration).
Admins adding staff via the Staff Management UI failed with:
  "new row violates row-level security policy for table staff"

## Solution
Admins may insert staff rows for any user_id; everyone else may still only
insert their own row (signup flow).
*/

DROP POLICY IF EXISTS "staff_insert" ON staff;
CREATE POLICY "staff_insert" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_admin_staff());
