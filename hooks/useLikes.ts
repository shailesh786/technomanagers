import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

// Question likes
export function useQuestionLikeCount(questionId: string) {
  return useQuery({
    queryKey: ['question_like_count', questionId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('question_likes')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', questionId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!questionId,
  });
}

export function useUserLikedQuestion(questionId: string, userId?: string) {
  return useQuery({
    queryKey: ['user_liked_question', questionId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_likes')
        .select('id')
        .eq('question_id', questionId)
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!questionId && !!userId,
  });
}

export function useToggleQuestionLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId, liked }: { questionId: string; userId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase.from('question_likes').delete().eq('question_id', questionId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('question_likes').insert({ question_id: questionId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question_like_count', vars.questionId] });
      qc.invalidateQueries({ queryKey: ['user_liked_question', vars.questionId] });
      qc.invalidateQueries({ queryKey: ['user_liked_questions'] });
    },
  });
}

// Comment likes
export function useCommentLikeCounts(commentIds: string[]) {
  return useQuery({
    queryKey: ['comment_like_counts', commentIds],
    queryFn: async () => {
      if (commentIds.length === 0) return {};
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(d => { counts[d.comment_id] = (counts[d.comment_id] || 0) + 1; });
      return counts;
    },
    enabled: commentIds.length > 0,
  });
}

export function useUserLikedComments(commentIds: string[], userId?: string) {
  return useQuery({
    queryKey: ['user_liked_comments', commentIds, userId],
    queryFn: async () => {
      if (!userId || commentIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', userId);
      if (error) throw error;
      return new Set(data.map(d => d.comment_id));
    },
    enabled: !!userId && commentIds.length > 0,
  });
}

export function useToggleCommentLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, userId, liked }: { commentId: string; userId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comment_like_counts'] });
      qc.invalidateQueries({ queryKey: ['user_liked_comments'] });
    },
  });
}

// User's liked questions (for profile)
export function useUserLikedQuestions(userId?: string) {
  return useQuery({
    queryKey: ['user_liked_questions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_likes')
        .select('question_id, created_at, question:questions(id, question_text, company, category, difficulty, upvotes)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
