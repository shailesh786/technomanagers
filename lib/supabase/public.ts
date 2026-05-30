import { createClient } from '@supabase/supabase-js';

/**
 * Cookieless, anonymous Supabase client for reading PUBLIC data in Server
 * Components and cached fetchers.
 *
 * Why this exists (and when to use it instead of createSupabaseServerClient):
 *
 *  1. createSupabaseServerClient() reads cookies(). Touching cookies() during a
 *     page render opts the ENTIRE route into dynamic rendering (`ƒ`), which
 *     silently defeats `export const revalidate = N` (ISR) and forces a fresh
 *     Supabase round-trip on every single visit.
 *  2. Inside unstable_cache(), Next 14 THROWS when cookies() is accessed, so a
 *     cookie-based client there fails silently and returns nothing.
 *
 * This client carries no session, so it can only read rows that are public to
 * the anon role via RLS (e.g. published questions, active courses/coaching,
 * upcoming events, active hero slides). Use it for those reads to keep pages
 * statically generated / ISR-cached. For anything that needs the logged-in
 * user's session, keep using createSupabaseServerClient().
 */
export function createSupabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
