import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/revalidate/questions
 *
 * Flushes the 'questions' ISR cache tag so the homepage and any other
 * pages using unstable_cache({ tags: ['questions'] }) rebuild immediately
 * on the next request, without waiting for the 5-minute revalidate window.
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

  revalidateTag('questions');
  return NextResponse.json({ revalidated: true });
}
