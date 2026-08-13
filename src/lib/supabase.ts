import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Analytics is entirely optional: if the two env vars above aren't set
 * (e.g. running locally without a Supabase project yet), `supabase` is
 * `null` and every tracking call in `src/lib/analytics.ts` becomes a
 * silent no-op instead of throwing. The site works exactly the same
 * either way — you only lose the /thong-ke dashboard's data.
 */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const isAnalyticsConfigured = !!supabase;
