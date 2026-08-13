import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { planPromotion } from '@/lib/hero';
import type { HeroItem } from '@/types';

// Cast to `any` until `supabase gen types` is re-run after applying the
// 20260814090000_hero_items migration — mirrors the pattern the other hooks
// use for tables the generated Database type doesn't know about yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createSupabaseBrowserClient() as any;

const ITEM_COLUMNS =
  'id, priority, visible, kind, title, subtitle, meta, cta_label, cta_href, tag_label, tag_color, image_url, icon, surface, show_from, hide_after, created_at, updated_at';

export const HERO_ITEMS_KEY = ['hero_items', 'all'] as const;

/**
 * Flush the homepage's ISR-cached hero board. Non-fatal on failure — the
 * 5-minute revalidate window picks the change up anyway.
 */
export async function revalidateHeroCache() {
  try {
    await fetch('/api/revalidate/hero', { method: 'POST' });
  } catch {
    /* non-fatal */
  }
}

/** Admin: all items — slots first (priority 1..3), then bench by last edit. */
export function useAllHeroItems() {
  return useQuery({
    queryKey: HERO_ITEMS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_items')
        .select(ITEM_COLUMNS)
        .order('priority', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as HeroItem[];
    },
  });
}

export type HeroItemInput = {
  kind: string;
  title: string;
  subtitle: string;
  meta: string;
  cta_label: string;
  cta_href: string;
  tag_label: string | null;
  tag_color: string;
  image_url: string | null;
  icon: string;
  surface: 'white' | 'navy';
  show_from: string | null;
  hide_after: string | null;
};

/** Insert (no id) or update (id) an item's content fields. */
export function useSaveHeroItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id?: string } & HeroItemInput) => {
      if (id) {
        const { error } = await supabase.from('hero_items').update(input).eq('id', id);
        if (error) throw error;
        return id;
      }
      // New items always start on the bench (priority null).
      const { data, error } = await supabase
        .from('hero_items')
        .insert(input)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: HERO_ITEMS_KEY });
      await revalidateHeroCache();
    },
  });
}

/** Optimistic visibility switch — flips the row immediately, rolls back on error. */
export function useToggleHeroItemVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from('hero_items').update({ visible }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, visible }) => {
      await qc.cancelQueries({ queryKey: HERO_ITEMS_KEY });
      const snapshot = qc.getQueryData<HeroItem[]>(HERO_ITEMS_KEY);
      qc.setQueryData<HeroItem[]>(HERO_ITEMS_KEY, (items) =>
        (items ?? []).map((i) => (i.id === id ? { ...i, visible } : i)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) qc.setQueryData(HERO_ITEMS_KEY, context.snapshot);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: HERO_ITEMS_KEY });
      await revalidateHeroCache();
    },
  });
}

/**
 * Move an item into a slot (1..3) or to the bench (null). Runs the ordered
 * steps from planPromotion sequentially so the one-item-per-slot unique index
 * is never violated mid-flight.
 */
export function useMoveHeroItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: number | null }) => {
      const items = qc.getQueryData<HeroItem[]>(HERO_ITEMS_KEY) ?? [];
      for (const step of planPromotion(items, id, priority)) {
        const { error } = await supabase
          .from('hero_items')
          .update({ priority: step.priority })
          .eq('id', step.id);
        if (error) throw error;
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: HERO_ITEMS_KEY });
      await revalidateHeroCache();
    },
  });
}

export function useDeleteHeroItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: HERO_ITEMS_KEY });
      await revalidateHeroCache();
    },
  });
}
