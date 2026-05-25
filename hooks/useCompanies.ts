import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export interface Company {
  id: string;
  name: string;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface CompanyWithCount {
  company_name: string;
  question_count: number;
}

/* ───────────────────── READ HOOKS ───────────────────── */

/** Companies with question counts. include_inactive=true for admin (returns ALL companies). */
export function useCompaniesWithCounts(includeInactive = false) {
  return useQuery({
    queryKey: ['companies', 'counts', includeInactive],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_companies_with_counts', {
        include_inactive: includeInactive,
      });
      if (error) throw error;
      return (data || []) as CompanyWithCount[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** All rows from the companies table (admin management page). */
export function useAllCompanies() {
  return useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Company[];
    },
  });
}

/** Active companies only (for the multi-select picker). */
export function useActiveCompanies() {
  return useQuery({
    queryKey: ['companies', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Company[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ─────────── BACKWARD-COMPAT (used by older code paths) ─────────── */

/** All distinct company names. Returns string[] sorted alphabetically. */
export function useUniqueCompanies(includeDrafts = false) {
  return useQuery({
    queryKey: ['companies', 'unique', includeDrafts],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .order('name', { ascending: true });
      if (error) throw error;
      return ((data || []) as { name: string }[]).map((r) => r.name).filter(Boolean);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Top N companies by published-question count. */
export function usePopularCompanies(limit = 8, enabled = true) {
  return useQuery({
    queryKey: ['companies', 'popular', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_companies_with_counts', {
        include_inactive: false,
      });
      if (error) throw error;
      return ((data || []) as CompanyWithCount[]).slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/* ───────────────────── MUTATIONS ───────────────────── */

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; display_order?: number; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: input.name.trim(),
          display_order: input.display_order ?? 0,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; display_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('companies').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}
