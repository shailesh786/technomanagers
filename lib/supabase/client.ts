/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase singleton using @supabase/ssr.
 *
 * ✅ Use in:  'use client' components, client-side hooks, TanStack Query fetchers
 * ❌ Never in: Server Components or middleware
 *
 * This replaces src/integrations/supabase/client.ts for all NEW Next.js code.
 * Session is stored in cookies (not localStorage) so the server can read it.
 *
 * Usage:
 *   import { createSupabaseBrowserClient } from '@/lib/supabase/client'
 *   const supabase = createSupabaseBrowserClient()
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

// Singleton pattern — reuse the same client instance across re-renders
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
