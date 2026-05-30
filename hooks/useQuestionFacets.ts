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
 * Fetches the facet-relevant columns for every published question in one go.
 * The questions corpus is small, so we compute faceted filter options in memory
 * (see QuestionsClient) rather than issuing a separate count query per filter.
 */
export function useQuestionFacets() {
  return useQuery({
    queryKey: ['question-facets'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('company, category, difficulty, role, question_text')
        .eq('status', 'published');
      if (error) throw error;
      return data as FacetRow[];
    },
  });
}
