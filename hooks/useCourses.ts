import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Course } from '@/types';

const supabase = createSupabaseBrowserClient();

export function useCourses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, short_description, thumbnail_url, external_url, category, display_order, status')
        .eq('status', 'active')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}
