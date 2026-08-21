import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/revalidate/cohort
 *
 * Flushes the 'cohort-testimonials' cache tag so /cohort rebuilds its
 * testimonial wall immediately after an admin edit, instead of waiting out
 * the 5-minute ISR window.
 *
 * Only callable by authenticated admins (profiles.is_admin = true).
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Both layers, deliberately. revalidateTag flushes the unstable_cache data
  // entry; revalidatePath purges the route's rendered output directly. In
  // production the tag alone proved unreliable at rebuilding the page — an
  // admin edit fired it twice and /cohort still served a build from an hour
  // earlier until a stale request finally forced a regeneration. The path
  // purge is the deterministic lever: the next request re-renders, and the
  // freshly-flushed tag guarantees that render reads fresh data.
  revalidateTag('cohort-testimonials');
  revalidatePath('/cohort');
  return NextResponse.json({ revalidated: true });
}
