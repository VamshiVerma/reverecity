-- Disable RLS on police_logs tables to allow unrestricted access
-- This is safe for public city data that should be openly accessible

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to police logs" ON public.police_logs;
DROP POLICY IF EXISTS "Allow public insert access to police logs" ON public.police_logs;
DROP POLICY IF EXISTS "Allow public update access to police logs" ON public.police_logs;
DROP POLICY IF EXISTS "Allow public read access to sync status" ON public.police_logs_sync_status;
DROP POLICY IF EXISTS "Allow public insert access to sync status" ON public.police_logs_sync_status;
DROP POLICY IF EXISTS "Allow public update access to sync status" ON public.police_logs_sync_status;

-- Disable RLS entirely
ALTER TABLE public.police_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_logs_sync_status DISABLE ROW LEVEL SECURITY;

-- Grant full access to public role (anon)
GRANT ALL ON public.police_logs TO anon;
GRANT ALL ON public.police_logs_sync_status TO anon;
GRANT ALL ON public.police_logs TO authenticated;
GRANT ALL ON public.police_logs_sync_status TO authenticated;

COMMENT ON TABLE public.police_logs IS 'Revere Police Department daily activity logs - public data with unrestricted access';
