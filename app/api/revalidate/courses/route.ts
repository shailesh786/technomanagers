import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/revalidate/courses
 *
 * Flushes the 'courses' cache tag and the /courses routes so an admin course
 * edit — including a course page's offer (coupon + countdown) — shows up
 * immediately instead of after the 5-minute ISR window. The tag also covers
 * the navbar's Courses menu, which every page reads through getActiveCourses.
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

  // Tag + path, as /api/revalidate/cohort does: the tag flushes the cached
  // data, the path purge makes the next request re-render with it.
  revalidateTag('courses');
  revalidatePath('/courses', 'layout');
  return NextResponse.json({ revalidated: true });
}
