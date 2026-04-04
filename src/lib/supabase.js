import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[feedio] Supabase env vars not set. ' +
    'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/**
 * Supabase client — import this anywhere you need DB / auth access.
 * Falls back gracefully when env vars are missing (demo mode).
 */
export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnon ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

/** True when real Supabase credentials are provided. */
export const SUPABASE_ENABLED =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://placeholder.supabase.co'
