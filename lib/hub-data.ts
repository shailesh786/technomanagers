/**
 * lib/hub-data.ts — data loading for the hub pages. Cookieless client only:
 * every caller is ISR. The taxonomy is unstable_cache'd under the 'questions'
 * tag, so admin edits flush it immediately via /api/revalidate/questions.
 */

import { unstable_cache } from 'next/cache';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';
import { buildHubTaxonomy, HUB_LIST_CAP, type HubKind, type HubTaxonomy } from '@/lib/hubs';
import type { Question } from '@/types';

export const getHubTaxonomy = unstable_cache(
  async (): Promise<HubTaxonomy> => {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase
      .from('questions')
      .select('company, category, role, updated_at')
      .eq('status', 'published');
    return buildHubTaxonomy(data ?? []);
  },
  ['question-hub-taxonomy'],
  { revalidate: 300, tags: ['questions'] },
);

/** The hub's questions as list rows (same shape as the /questions cards), best first. */
export async function getHubQuestions(kind: HubKind, name: string): Promise<Question[]> {
  const supabase = createSupabasePublicClient();
  let query = supabase
    .from('questions')
    .select(QUESTION_LIST_SELECT)
    .eq('status', 'published')
    // count only non-deleted comments — must match useQuestions()/useCommentCount()
    .is('question_comments.deleted_at', null);
  query = kind === 'role' ? query.eq('role', name) : query.contains(kind, [name]);
  const { data } = await query
    .order('upvotes', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(HUB_LIST_CAP);
  return flattenCommentCount(data ?? []) as unknown as Question[];
}
