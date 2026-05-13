import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/types';

export function useQuestions(filters?: {
  category?: string;
  companies?: string[];
  difficulties?: string[];
  role?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, question_text, company, category, tags, difficulty, role, status, upvotes, created_at')
        .eq('status', 'published');

      if (filters?.category && filters.category !== 'All') {
        query = query.contains('category', [filters.category]);
      }
      if (filters?.companies && filters.companies.length > 0) {
        // Filter questions that contain ANY of the selected companies
        query = query.or(filters.companies.map(c => `company.cs.{${c}}`).join(','));
      }
      if (filters?.role) {
        // Role is matched against the tags array (questions can be tagged with multiple roles)
        query = query.contains('tags', [filters.role]);
      }
      if (filters?.difficulties && filters.difficulties.length > 0) {
        query = query.in('difficulty', filters.difficulties);
      }
      if (filters?.search) {
        query = query.ilike('question_text', `%${filters.search}%`);
      }

      if (filters?.sort === 'Newest') {
        query = query.order('created_at', { ascending: false });
      } else if (filters?.sort === 'Oldest') {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('upvotes', { ascending: false });
      }

      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data as Question[];
    },
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Question;
    },
    enabled: !!id,
  });
}

export function useUpvoteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: question } = await supabase
        .from('questions')
        .select('upvotes')
        .eq('id', id)
        .single();
      const { error } = await supabase
        .from('questions')
        .update({ upvotes: (question?.upvotes || 0) + 1 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question'] });
    },
  });
}

export function useSavedQuestions(userId?: string) {
  return useQuery({
    queryKey: ['saved_questions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_questions')
        .select('question_id')
        .eq('user_id', userId!);
      if (error) throw error;
      return data.map(d => d.question_id);
    },
    enabled: !!userId,
  });
}

export function useSaveQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, questionId }: { userId: string; questionId: string }) => {
      const { error } = await supabase
        .from('saved_questions')
        .insert({ user_id: userId, question_id: questionId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved_questions'] }),
  });
}

export function useUnsaveQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, questionId }: { userId: string; questionId: string }) => {
      const { error } = await supabase
        .from('saved_questions')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved_questions'] }),
  });
}
