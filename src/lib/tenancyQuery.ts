import { supabase } from './supabase';

/**
 * Checks if a Supabase PostgREST error was caused by the 'clinic_id' column
 * not existing in the remote database yet (e.g. before migrations are executed).
 */
export function isMissingClinicIdColumnError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === '42703' || // Postgres error: undefined_column
    error.code === 'PGRST204' || // PostgREST: column not found
    (typeof error.message === 'string' && error.message.toLowerCase().includes('clinic_id'))
  );
}

/**
 * Applies multi-tenant filter to a Supabase query.
 * For the primary clinic ('clinic-dentivista-01'), it also includes legacy rows
 * where clinic_id IS NULL so pre-existing data is not lost.
 */
export function applyClinicFilter(query: any, clinicId: string): any {
  if (clinicId === 'clinic-dentivista-01') {
    return query.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
  }
  return query.eq('clinic_id', clinicId);
}
