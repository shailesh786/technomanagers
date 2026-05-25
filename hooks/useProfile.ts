import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export function useUserComments(userId?: string) {
  return useQuery({
    queryKey: ['user_comments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_comments')
        .select('id, content, created_at, question_id, question:questions(id, question_text, company, category)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUserSavedQuestionsWithDetails(userId?: string) {
  return useQuery({
    queryKey: ['user_saved_details', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_questions')
        .select('id, created_at, question_id, question:questions(id, question_text, company, category, difficulty)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
