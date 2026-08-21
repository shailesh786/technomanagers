import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { TESTIMONIAL_COLUMNS } from '@/lib/cohort-testimonials';
import type { CohortTestimonial, CohortTestimonialKind } from '@/types';

// Cast to `any` until `supabase gen types` is re-run after applying the
// 20260821000000_cohort_testimonials migration — mirrors the pattern the hero
// and cohort-settings hooks use for tables the generated Database type does
// not know about yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createSupabaseBrowserClient() as any;

export const COHORT_TESTIMONIALS_KEY = ['cohort_testimonials', 'all'] as const;

/**
 * Flush the cohort page's ISR cache. Non-fatal on failure — the 5-minute
 * revalidate window picks the change up anyway.
 */
export async function revalidateCohortCache() {
  try {
    await fetch('/api/revalidate/cohort', { method: 'POST' });
  } catch {
    /* non-fatal */
  }
}

/** Admin: every row, hidden ones included, in stream order. */
export function useAllCohortTestimonials() {
  return useQuery({
    queryKey: COHORT_TESTIMONIALS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohort_testimonials')
        .select(TESTIMONIAL_COLUMNS)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CohortTestimonial[];
    },
  });
}

export type CohortTestimonialInput = {
  kind: CohortTestimonialKind;
  visible: boolean;
  display_order: number;
  name: string;
  role: string;
  outcome: string;
  quote: string;
  video_url: string | null;
  video_length: string;
  image_url: string | null;
};

export function useCreateCohortTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CohortTestimonialInput) => {
      const { error } = await supabase.from('cohort_testimonials').insert(input);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: COHORT_TESTIMONIALS_KEY });
      await revalidateCohortCache();
    },
  });
}

export function useUpdateCohortTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CohortTestimonialInput & { id: string }) => {
      const { error } = await supabase.from('cohort_testimonials').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: COHORT_TESTIMONIALS_KEY });
      await revalidateCohortCache();
    },
  });
}

export function useDeleteCohortTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cohort_testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: COHORT_TESTIMONIALS_KEY });
      await revalidateCohortCache();
    },
  });
}

/**
 * Show/hide a single row. Optimistic so the switch does not lag behind the
 * click, with a rollback if the write is rejected.
 */
export function useToggleCohortTestimonialVisible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from('cohort_testimonials').update({ visible }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, visible }) => {
      await qc.cancelQueries({ queryKey: COHORT_TESTIMONIALS_KEY });
      const previous = qc.getQueryData<CohortTestimonial[]>(COHORT_TESTIMONIALS_KEY);
      qc.setQueryData<CohortTestimonial[]>(COHORT_TESTIMONIALS_KEY, (rows) =>
        rows?.map((r) => (r.id === id ? { ...r, visible } : r)),
      );
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(COHORT_TESTIMONIALS_KEY, ctx.previous);
    },
    onSuccess: () => revalidateCohortCache(),
    onSettled: () => qc.invalidateQueries({ queryKey: COHORT_TESTIMONIALS_KEY }),
  });
}

/**
 * Rewrite the whole stream order.
 *
 * Callers pass the rows in their new order; every position is renumbered to
 * `index * 10`. Swapping the two neighbours' `display_order` values would be
 * fewer writes, but it silently no-ops whenever rows share a value — which the
 * seeded rows and anything inserted at the default 0 do. Normalising is
 * self-healing: one move cleans up the whole list.
 *
 * Only rows whose value actually changes are written, so a settled list costs
 * one or two updates per move rather than N.
 */
export function useReorderCohortTestimonials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: CohortTestimonial[]) => {
      const changed = ordered
        .map((row, i) => ({ row, order: i * 10 }))
        .filter(({ row, order }) => row.display_order !== order);
      if (changed.length === 0) return;

      const results = await Promise.all(
        changed.map(({ row, order }) =>
          supabase.from('cohort_testimonials').update({ display_order: order }).eq('id', row.id),
        ),
      );
      const failed = results.find((r: { error: unknown }) => r.error);
      if (failed?.error) throw failed.error;
    },
    // Optimistic: reordering should feel instant, not wait on a round trip.
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: COHORT_TESTIMONIALS_KEY });
      const previous = qc.getQueryData<CohortTestimonial[]>(COHORT_TESTIMONIALS_KEY);
      qc.setQueryData<CohortTestimonial[]>(
        COHORT_TESTIMONIALS_KEY,
        ordered.map((r, i) => ({ ...r, display_order: i * 10 })),
      );
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(COHORT_TESTIMONIALS_KEY, ctx.previous);
    },
    onSuccess: () => revalidateCohortCache(),
    onSettled: () => qc.invalidateQueries({ queryKey: COHORT_TESTIMONIALS_KEY }),
  });
}
