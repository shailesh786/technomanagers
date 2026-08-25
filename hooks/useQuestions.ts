import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { csContains, eqFilter, pgArrayLiteral } from '@/lib/postgrest';
import { toast } from 'sonner';
import type { Question } from '@/types';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';

const supabase = createSupabaseBrowserClient();

export function useQuestions(filters?: {
  /** Single category for homepage pill filter */
  category?: string;
  /** Multi-category for questions page filter */
  categories?: string[];
  companies?: string[];
  difficulties?: string[];
  role?: string;
  /**
   * Homepage pill filter: match a question whose `role` column equals the value
   * OR whose `category` array contains it. Pills are role names, but some
   * questions only carry the equivalent category tag — this surfaces both.
   */
  roleOrCategory?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['questions', filters],
    staleTime: 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(QUESTION_LIST_SELECT)
        .eq('status', 'published')
        // count only non-deleted comments — must match useCommentCount()
        .is('question_comments.deleted_at', null);

      // Homepage single-pill filter
      if (filters?.category && filters.category !== 'All') {
        query = query.contains('category', pgArrayLiteral([filters.category]));
      }
      // Homepage pill: role column OR category array contains the value
      if (filters?.roleOrCategory && filters.roleOrCategory !== 'All') {
        const v = filters.roleOrCategory;
        query = query.or([eqFilter('role', v), csContains('category', v)].join(','));
      }
      // Questions-page multi-category filter (OR logic)
      if (filters?.categories && filters.categories.length > 0) {
        query = query.or(filters.categories.map(c => csContains('category', c)).join(','));
      }
      if (filters?.companies && filters.companies.length > 0) {
        query = query.or(filters.companies.map(c => csContains('company', c)).join(','));
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.difficulties && filters.difficulties.length > 0) {
        query = query.in('difficulty', filters.difficulties);
      }
      if (filters?.search) {
        query = query.ilike('question_text', `%${filters.search}%`);
      }

      // Every sort ends on the unique id so equal-ranked rows keep a stable
      // order across pages — without it, Load More repeats/skips rows.
      // These chains are MIRRORED in the server prefetches (app/page.tsx
      // getHotQuestions, app/questions/page.tsx getDefaultQuestions) — keep
      // them byte-identical.
      if (filters?.sort === 'Newest') {
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      } else if (filters?.sort === 'Oldest') {
        query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
      } else {
        query = query
          .order('upvotes', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
      }

      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      return flattenCommentCount(data ?? []) as unknown as Question[];
    },
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, company, category, tags, difficulty, role, status, upvotes, sample_answer, created_at, updated_at')
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
      // Cast needed until supabase gen types is re-run after applying the migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('increment_upvotes', { question_id: id });
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // Optimistically update the detail cache
      queryClient.setQueryData<Question>(['question', id], (old) =>
        old ? { ...old, upvotes: (old.upvotes ?? 0) + 1 } : old,
      );
      // Update every cached list that contains this question
      queryClient.setQueriesData<Question[]>(
        { queryKey: ['questions'], exact: false },
        (old) => old?.map((q) => (q.id === id ? { ...q, upvotes: (q.upvotes ?? 0) + 1 } : q)),
      );
    },
    onError: () => {
      toast.error('Failed to upvote. Please try again.');
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
