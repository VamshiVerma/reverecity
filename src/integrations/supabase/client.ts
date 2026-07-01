import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Public project connection. The anon key is meant to be exposed in the browser.
// Values fall back to the current project but can be overridden via .env
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) to point at another account.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ckwiryfnnguarcsgiuws.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrd2lyeWZubmd1YXJjc2dpdXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTQxNjcsImV4cCI6MjA5ODQ5MDE2N30.INGdvnXKagkApH1jo83uivREQYraDuzoyoveMHNRaBo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);