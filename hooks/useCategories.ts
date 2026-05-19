import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export interface Category {
  id: string;
  name: string;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
}

/** Public-facing: only active categories, ordered by display_order. */
export function useCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin: all categories including inactive. */
export function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });
}

/** For each active category, count published questions tagged with it. */
export function useCategoryQuestionCounts() {
  return useQuery({
    queryKey: ['categories', 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('category')
        .eq('status', 'published');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((q: { category: string[] | null }) => {
        (q.category || []).forEach((c) => {
          counts[c] = (counts[c] || 0) + 1;
        });
      });
      return counts;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; display_order: number; is_active?: boolean }) => {
      const { error } = await supabase.from('categories').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; display_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('categories').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
