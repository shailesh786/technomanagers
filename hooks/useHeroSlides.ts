import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { HeroSlide } from '@/types';

// Cast to `any` until `supabase gen types` is re-run after applying the
// 20260530000001_hero_slides migration — the generated Database type doesn't
// yet know about the `hero_slides` table. Mirrors the existing pattern used
// for the increment_upvotes RPC in useQuestions.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createSupabaseBrowserClient() as any;

const SLIDE_COLUMNS =
  'id, title, highlight, description, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, display_order, is_active, created_at, updated_at';

/** Public-facing: only active slides, ordered. */
export function useHeroSlides(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['hero_slides', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(SLIDE_COLUMNS)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin: all slides including inactive. */
export function useAllHeroSlides() {
  return useQuery({
    queryKey: ['hero_slides', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(SLIDE_COLUMNS)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
  });
}

export type HeroSlideInput = {
  title: string;
  highlight?: string | null;
  description: string;
  primary_cta_label?: string | null;
  primary_cta_href?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_href?: string | null;
  display_order?: number;
  is_active?: boolean;
};

export function useCreateHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HeroSlideInput) => {
      const { error } = await supabase.from('hero_slides').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero_slides'] }),
  });
}

export function useUpdateHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<HeroSlideInput>) => {
      const { error } = await supabase.from('hero_slides').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero_slides'] }),
  });
}

export function useDeleteHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero_slides'] }),
  });
}
