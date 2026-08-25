import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  commentCountQueryKey,
  commentsQueryKey,
  fetchCommentCount,
  fetchCommentsPage,
  fetchQuestionReplies,
  nextCommentsPageParam,
  type CommentSort,
} from '@/lib/comments-query';

export type { Comment } from '@/lib/comments-query';

const supabase = createSupabaseBrowserClient();

// The query shape (select, filters, order, page size) lives in
// lib/comments-query.ts so the question detail route can prefetch the first
// page with the public client and hydrate this exact key. Keep it there.
export function useComments(questionId: string, sort: CommentSort = 'newest') {
  return useInfiniteQuery({
    queryKey: commentsQueryKey(questionId, sort),
    // 5 min ≥ the detail page's ISR window, so a mount on fresh HTML trusts
    // the hydrated server prefetch; comment mutations invalidate explicitly.
    staleTime: 5 * 60 * 1000,
    queryFn: ({ pageParam = 0 }) => fetchCommentsPage(supabase, questionId, sort, pageParam),
    getNextPageParam: nextCommentsPageParam,
    initialPageParam: 0,
    enabled: !!questionId,
  });
}

/**
 * ALL replies on a question in one request. CommentsSection groups them by
 * parent (lib/comments-query groupRepliesByParent) and passes each comment its
 * slice — replacing the old per-comment replies query that fired once per
 * top-level comment.
 */
export function useQuestionReplies(questionId: string) {
  return useQuery({
    queryKey: ['comment_replies', questionId],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchQuestionReplies(supabase, questionId),
    enabled: !!questionId,
  });
}

export function useCommentCount(questionId: string) {
  return useQuery({
    queryKey: commentCountQueryKey(questionId),
    // Server-prefetched key — see useComments() staleTime note.
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchCommentCount(supabase, questionId),
    enabled: !!questionId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId, content, parentId }: {
      questionId: string; userId: string; content: string; parentId?: string;
    }) => {
      const { error } = await supabase.from('question_comments').insert({
        question_id: questionId,
        user_id: userId,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.questionId] });
      qc.invalidateQueries({ queryKey: ['comment_count', vars.questionId] });
      if (vars.parentId) qc.invalidateQueries({ queryKey: ['comment_replies', vars.questionId] });
    },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from('question_comments').update({ content }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['comment_replies'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('question_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['comment_count'] });
      qc.invalidateQueries({ queryKey: ['comment_replies'] });
    },
  });
}
