/**
 * lib/supabase/middleware-client.ts
 *
 * Supabase client factory for use ONLY inside middleware.ts.
 *
 * The middleware needs a special client that can both read AND write cookies
 * via the NextRequest / NextResponse API — the server.ts and client.ts
 * factories use different cookie adapters that don't work in edge middleware.
 *
 * ✅ Use in:  middleware.ts ONLY
 * ❌ Never in: RSC, Route Handlers, or client components
 */

import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/types';

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the request (so RSC can read them
          // in the same flight) and the response (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
