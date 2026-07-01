import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase connection is read from environment variables so the project can be
// pointed at a different Supabase account without any code changes. Set these in
// your .env file (see .env.example):
//   VITE_SUPABASE_URL       e.g. https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  the project's public anon / publishable key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);