import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Event } from '@/types';

const supabase = createSupabaseBrowserClient();

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });
}
