import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { CoachingService } from '@/types';

const supabase = createSupabaseBrowserClient();

export function useCoaching(filter?: string) {
  return useQuery({
    queryKey: ['coaching', filter],
    staleTime: 5 * 60 * 1000, // treat server-hydrated data as fresh for 5 min
    queryFn: async () => {
      let query = supabase
        .from('coaching_services')
        .select('id, title, service_type, short_description, price, original_price, duration, platform, rating, external_url, badge_text, display_order, status')
        .eq('status', 'active')
        .order('display_order', { ascending: true });

      if (filter && filter !== 'All') {
        const typeMap: Record<string, string> = {
          'Mock Interview': 'mock_interview',
          'Resume Review': 'resume_review',
          'Mentorship': 'mentorship',
          'Masterclass': 'masterclass',
        };
        if (typeMap[filter]) {
          query = query.eq('service_type', typeMap[filter]);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CoachingService[];
    },
  });
}
