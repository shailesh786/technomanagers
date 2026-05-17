/**
 * integrations/supabase/client.ts  —  Bridge file
 *
 * WHY THIS EXISTS:
 * All hooks in src/hooks/ import `{ supabase } from '@/integrations/supabase/client'`.
 * In the old Vite build, `@/` pointed to `src/`, so that resolved fine.
 * After the Next.js migration, `@/` points to the project root, so this bridge
 * file catches those imports and re-exports the new cookie-based browser client
 * under the same `supabase` name.
 *
 * This means zero changes are required to any file in src/hooks/.
 * Queries, mutations, and all Supabase logic stay byte-for-byte identical.
 *
 * REMOVE THIS FILE in Phase 6 once src/hooks/ are moved to hooks/ at root
 * and updated to import from @/lib/supabase/client directly.
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const supabase = createSupabaseBrowserClient();
