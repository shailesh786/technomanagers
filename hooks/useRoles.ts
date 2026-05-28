import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export interface Role {
  id: string;
  name: string;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
}

/** Public-facing: only active roles, ordered. */
export function useRoles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['roles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Role[];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin: all roles including inactive. */
export function useAllRoles() {
  return useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useRoleQuestionCounts() {
  return useQuery({
    queryKey: ['roles', 'counts'],
    staleTime: 5 * 60 * 1000, // treat server-hydrated data as fresh for 5 min
    queryFn: async () => {
      // Use `role` column (not `tags`) — matches the role filter in QuestionsClient
      const { data, error } = await supabase
        .from('questions')
        .select('role')
        .eq('status', 'published')
        .not('role', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((q: { role: string | null }) => {
        if (q.role) counts[q.role] = (counts[q.role] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; display_order: number }) => {
      const { error } = await supabase.from('roles').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; display_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('roles').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}
