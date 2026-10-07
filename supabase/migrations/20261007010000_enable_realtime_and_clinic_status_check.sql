/*
# Realtime Clinic Status Publication Migration

## Summary
1. Ensures the `clinics` table is included in `supabase_realtime` publication.
   This guarantees that changes made to the `status` column in the Supabase Dashboard
   broadcast instantaneous WebSocket events to all connected clients and active sessions.
2. Ensures replica identity is FULL on clinics so update payloads contain complete row state.
*/

-- 1. Set replica identity to full so update events carry complete new and old row data
ALTER TABLE public.clinics REPLICA IDENTITY FULL;

-- 2. Add clinics to supabase_realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'clinics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- publication may not exist in pure local tests, safe to ignore
  NULL;
END $$;
