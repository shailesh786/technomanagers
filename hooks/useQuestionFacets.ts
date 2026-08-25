import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

/** Minimal per-question shape used to compute filter facet counts. */
export interface FacetRow {
  company: string[] | null;
  category: string[] | null;
  difficulty: string | null;
  role: string | null;
  question_text: string;
}

/**
 * Column list for the facets query — shared with the /questions server
 * prefetch (app/questions/page.tsx) so both sides fetch the same shape.
 * question_text MUST stay in the list: QuestionsClient.matchSearch needs it
 * to compute search-constrained facet counts.
 */
export const FACET_SELECT = 'company, category, difficulty, role, question_text';

/**
 * Fetches the facet-relevant columns for every published question in one go.
 * The questions corpus is small, so we compute faceted filter options in memory
 * (see QuestionsClient) rather than issuing a separate count query per filter.
 */
export function useQuestionFacets() {
  return useQuery({
    queryKey: ['question-facets'],
    // Server-prefetched key — 5 min ≥ the page's ISR window, so a mount on
    // fresh HTML trusts the hydrated prefetch instead of re-downloading the
    // whole corpus.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(FACET_SELECT)
        .eq('status', 'published');
      if (error) throw error;
      return data as FacetRow[];
    },
  });
}
