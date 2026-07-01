-- Tables that the edge functions and frontend reference but that were never
-- captured as migrations in the original project. Schemas reconstructed from
-- src/integrations/supabase/types.ts (the generated Supabase types).

-- Budget insights (written by populate-insights / process-budget-pdf, read by frontend)
CREATE TABLE IF NOT EXISTS public.budget_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  year INTEGER NOT NULL,
  description TEXT,
  trend TEXT,
  trend_percentage NUMERIC,
  priority_level TEXT,
  per_capita NUMERIC,
  source_page TEXT,
  insight_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Q&A log (written by process-budget-pdf)
CREATE TABLE IF NOT EXISTS public.budget_qa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather cache (written by fetch-weather, read by frontend)
CREATE TABLE IF NOT EXISTS public.weather_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT NOT NULL,
  temp NUMERIC NOT NULL,
  conditions TEXT NOT NULL,
  current_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  humidity NUMERIC NOT NULL,
  icon TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public city data: allow read + write via the anon role (matches existing project pattern)
ALTER TABLE public.budget_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['budget_insights','budget_qa','weather_data'] LOOP
    EXECUTE format('CREATE POLICY "public select %1$s" ON public.%1$s FOR SELECT TO public USING (true);', t);
    EXECUTE format('CREATE POLICY "public insert %1$s" ON public.%1$s FOR INSERT TO public WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public update %1$s" ON public.%1$s FOR UPDATE TO public USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- Storage bucket for uploaded budget PDFs (used by process-budget-pdf)
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-docs', 'budget-docs', false)
ON CONFLICT (id) DO NOTHING;
