import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { CohortSettings } from '@/types';

// Cast to `any` until `supabase gen types` is re-run after applying the
// 20260530000002_cohort_settings migration — the generated Database type
// doesn't yet know about the `cohort_settings` table.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createSupabaseBrowserClient() as any;

/**
 * Single-row cohort config (Apply Now / WhatsApp CTA links).
 * Returns null if the row is missing or the table doesn't exist yet, so the
 * cohort page can fall back to its hardcoded constants.
 */
export function useCohortSettings() {
  return useQuery({
    queryKey: ['cohort_settings'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CohortSettings | null> => {
      const { data, error } = await supabase
        .from('cohort_settings')
        .select('id, apply_url, whatsapp_url, progress_url, created_at, updated_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as CohortSettings | null) ?? null;
    },
  });
}

export type CohortSettingsInput = {
  apply_url: string;
  whatsapp_url: string;
  progress_url: string | null;
};

/**
 * Upserts the single cohort-settings row: updates the existing row if one
 * exists, otherwise inserts the first row.
 */
export function useUpdateCohortSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CohortSettingsInput) => {
      const { data: existing } = await supabase
        .from('cohort_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('cohort_settings')
          .update(input)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cohort_settings').insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cohort_settings'] }),
  });
}
