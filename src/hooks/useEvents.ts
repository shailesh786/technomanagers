import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
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
