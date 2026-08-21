import { revalidateTag } from 'next/cache';
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

  revalidateTag('cohort-testimonials');
  return NextResponse.json({ revalidated: true });
}
