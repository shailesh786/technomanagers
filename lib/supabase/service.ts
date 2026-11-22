/**
 * lib/supabase/service.ts — service-role Supabase client. BYPASSES RLS.
 *
 * Server-only, and only for the few route handlers that must write rows the
 * public may not write directly (currently /api/cohort-applications).
 * Never import this from a 'use client' file, a Server Component that renders
 * user-controlled queries, or anything that ships to the browser — the key in
 * SUPABASE_SERVICE_ROLE_KEY has full database access. It is deliberately NOT
 * prefixed NEXT_PUBLIC_, so Next never inlines it into a client bundle.
 */
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
