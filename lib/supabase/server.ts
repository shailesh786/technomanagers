/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client factory using @supabase/ssr.
 *
 * ✅ Use in:  React Server Components, Route Handlers, Server Actions
 * ❌ Never in: 'use client' files — it imports next/headers which is server-only
 *
 * Usage:
 *   import { createSupabaseServerClient } from '@/lib/supabase/server'
 *   const supabase = await createSupabaseServerClient()
 *   const { data } = await supabase.from('questions').select('*')
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@src/integrations/supabase/types';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // The middleware handles cookie writes so this is safe to ignore.
          }
        },
      },
    }
  );
}
