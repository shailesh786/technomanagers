/**
 * lib/hub-data.ts — data loading for the hub pages. Cookieless client only:
 * every caller is ISR. The taxonomy is unstable_cache'd under the 'questions'
 * tag, so admin edits flush it immediately via /api/revalidate/questions.
 */

import { unstable_cache } from 'next/cache';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { pgArrayLiteral } from '@/lib/postgrest';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';
import { buildHubTaxonomy, HUB_LIST_CAP, type HubKind, type HubTaxonomy } from '@/lib/hubs';
import type { Question } from '@/types';

export const getHubTaxonomy = unstable_cache(
  async (): Promise<HubTaxonomy> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('questions')
      .select('company, category, role, updated_at')
      .eq('status', 'published');
    // Throw so unstable_cache does NOT cache the result — a swallowed DB blip
    // would otherwise cache an empty taxonomy and 404 every hub URL for 300s.
    if (error) throw error;
    return buildHubTaxonomy(data ?? []);
  },
  ['question-hub-taxonomy'],
  { revalidate: 300, tags: ['questions'] },
);

/** The hub's questions as list rows (same shape as the /questions cards), newest first. */
export async function getHubQuestions(kind: HubKind, name: string): Promise<Question[]> {
  const supabase = createSupabasePublicClient();
  let query = supabase
    .from('questions')
    .select(QUESTION_LIST_SELECT)
    .eq('status', 'published')
    // count only non-deleted comments — must match useQuestions()/useCommentCount()
    .is('question_comments.deleted_at', null);
  query = kind === 'role' ? query.eq('role', name) : query.contains(kind, pgArrayLiteral([name]));
  // Same chain as the /questions 'Newest' sort in useQuestions() — keep in sync.
  const { data } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(HUB_LIST_CAP);
  return flattenCommentCount(data ?? []) as unknown as Question[];
}
