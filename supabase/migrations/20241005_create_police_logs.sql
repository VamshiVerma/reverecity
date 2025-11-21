-- Create police_logs table for Revere Police Department daily logs
CREATE TABLE IF NOT EXISTS public.police_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core identifiers
  call_number TEXT NOT NULL UNIQUE,
  log_date DATE NOT NULL,

  -- Time information
  time_24h TEXT NOT NULL, -- Original 4-digit time (e.g., "0804")
  timestamp TIMESTAMPTZ NOT NULL, -- Full timestamp for queries

  -- Call details
  call_reason TEXT NOT NULL,
  call_type_category TEXT, -- Normalized category (TRAFFIC, ASSIST, DOMESTIC, etc.)
  action TEXT NOT NULL,
  action_category TEXT, -- Normalized (SERVICES_RENDERED, REPORT, NO_ACTION, etc.)

  -- Location information
  location_code TEXT, -- [REV 24865] code
  location_address TEXT,
  location_street TEXT, -- Extracted street name for grouping

  -- Raw data for RAG
  raw_entry TEXT NOT NULL, -- Original full text entry

  -- Metadata
  source_url TEXT, -- PDF URL this came from
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_police_logs_date ON public.police_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_police_logs_timestamp ON public.police_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_police_logs_call_number ON public.police_logs(call_number);
CREATE INDEX IF NOT EXISTS idx_police_logs_call_type ON public.police_logs(call_type_category);
CREATE INDEX IF NOT EXISTS idx_police_logs_action ON public.police_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_police_logs_location ON public.police_logs(location_street);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_police_logs_search
  ON public.police_logs
  USING gin(to_tsvector('english', call_reason || ' ' || location_address || ' ' || action));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_police_logs_updated_at
  BEFORE UPDATE ON public.police_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for daily statistics
CREATE OR REPLACE VIEW public.police_logs_daily_stats AS
SELECT
  log_date,
  COUNT(*) as total_calls,
  COUNT(DISTINCT call_type_category) as unique_call_types,
  COUNT(DISTINCT location_street) as unique_locations,
  COUNT(*) FILTER (WHERE action_category = 'REPORT') as reports_filed,
  COUNT(*) FILTER (WHERE action_category = 'SERVICES_RENDERED') as services_rendered,
  COUNT(*) FILTER (WHERE action_category = 'NO_ACTION') as no_action_required
FROM public.police_logs
GROUP BY log_date
ORDER BY log_date DESC;

-- Create a view for call type breakdown
CREATE OR REPLACE VIEW public.police_logs_call_types AS
SELECT
  call_type_category,
  COUNT(*) as count,
  COUNT(DISTINCT log_date) as days_active,
  MIN(log_date) as first_seen,
  MAX(log_date) as last_seen
FROM public.police_logs
WHERE call_type_category IS NOT NULL
GROUP BY call_type_category
ORDER BY count DESC;

-- Create a view for location hotspots
CREATE OR REPLACE VIEW public.police_logs_location_hotspots AS
SELECT
  location_street,
  COUNT(*) as incident_count,
  COUNT(DISTINCT call_type_category) as call_types,
  array_agg(DISTINCT call_type_category) as common_call_types
FROM public.police_logs
WHERE location_street IS NOT NULL
GROUP BY location_street
HAVING COUNT(*) > 5 -- Only show locations with 5+ incidents
ORDER BY incident_count DESC;

-- Create a table for tracking sync status
CREATE TABLE IF NOT EXISTS public.police_logs_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL, -- 'pending', 'success', 'failed'
  records_added INTEGER DEFAULT 0,
  source_url TEXT,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_status_date ON public.police_logs_sync_status(sync_date DESC);

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE public.police_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_logs_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Allow public read access to police logs"
  ON public.police_logs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to sync status"
  ON public.police_logs_sync_status
  FOR SELECT
  TO public
  USING (true);

COMMENT ON TABLE public.police_logs IS 'Revere Police Department daily activity logs with normalized data for analytics';
COMMENT ON TABLE public.police_logs_sync_status IS 'Tracks daily sync status for automated PDF fetching';
