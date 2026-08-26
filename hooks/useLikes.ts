import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Question } from '@/types';

const supabase = createSupabaseBrowserClient();

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

/**
 * Toggle like from the question DETAIL page.
 *
 * ⚠️ MUST go through the toggle_question_like RPC — the same write path the
 * list cards use (useToggleLike below). A previous version did a raw
 * insert/delete on question_likes here, which never updated the
 * questions.upvotes counter, so like counts on the detail page and the list
 * cards drifted apart permanently.
 *
 * Optimistic: flips the heart state and the upvotes counter caches
 * immediately, rolls back on error.
 */
export function useToggleQuestionLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; userId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('toggle_question_like', {
        p_question_id: questionId,
      });
      if (error) throw error;
      return data as { liked: boolean };
    },
    onMutate: async ({ questionId, userId }) => {
      // Settle in-flight fetches of the keys we're about to write, so a
      // response landing mid-toggle can't overwrite the optimistic state.
      await Promise.all([
        qc.cancelQueries({ queryKey: ['user_liked_question', questionId, userId] }),
        qc.cancelQueries({ queryKey: ['question', questionId] }),
      ]);

      // The current heart state comes from the cache, not the caller — a
      // component rendered before its liked-query resolved would pass a stale
      // flag (false while loading) and move the counter the wrong way.
      const liked = qc.getQueryData<boolean>(['user_liked_question', questionId, userId]) ?? false;
      const delta = liked ? -1 : 1;

      // Heart fill state (detail page reads this key)
      qc.setQueryData(['user_liked_question', questionId, userId], !liked);

      // Upvote counter — detail cache and every cached list
      qc.setQueryData<Question>(['question', questionId], (old) =>
        old ? { ...old, upvotes: Math.max(0, (old.upvotes ?? 0) + delta) } : old,
      );
      qc.setQueriesData<Question[]>(
        { queryKey: ['questions'], exact: false },
        (old) =>
          old?.map((q) =>
            q.id === questionId ? { ...q, upvotes: Math.max(0, (q.upvotes ?? 0) + delta) } : q,
          ),
      );

      return { questionId, userId, liked };
    },
    onError: (_err, vars, context) => {
      // Roll back the optimistic flips and refetch the counters
      if (context) {
        qc.setQueryData(['user_liked_question', context.questionId, context.userId], context.liked);
      }
      qc.invalidateQueries({ queryKey: ['question', vars.questionId] });
      qc.invalidateQueries({ queryKey: ['questions'] });
      toast.error('Failed to update like. Please try again.');
    },
    onSuccess: (data, vars, context) => {
      // The RPC returns the authoritative liked state — write it directly.
      qc.setQueryData(['user_liked_question', vars.questionId, vars.userId], data.liked);
      // If the server landed on the same state we started from, the optimistic
      // flip (and its counter delta) was wrong — refetch the counters.
      if (context && data.liked === context.liked) {
        qc.invalidateQueries({ queryKey: ['question', vars.questionId] });
        qc.invalidateQueries({ queryKey: ['questions'] });
      }
      // Sync the other caches that track the user's liked set
      qc.invalidateQueries({ queryKey: ['user_liked_questions'] });
      qc.invalidateQueries({ queryKey: ['user_liked_question_ids'] });
    },
  });
}

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

/**
 * Batch-fetch the set of question IDs liked by a user.
 * Used by card list views (QuestionsClient, FeaturedQuestionsSection) to
 * show the filled blue state on upvote buttons without a per-card query.
 */
export function useUserLikedQuestionIds(userId?: string) {
  return useQuery({
    queryKey: ['user_liked_question_ids', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_likes')
        .select('question_id')
        .eq('user_id', userId!);
      if (error) throw error;
      return new Set(data.map((d) => d.question_id as string));
    },
    enabled: !!userId,
  });
}

/**
 * Toggle like on a question card.
 * Calls the toggle_question_like RPC (atomically updates question_likes +
 * questions.upvotes), with optimistic updates for instant UI feedback.
 */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; userId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('toggle_question_like', {
        p_question_id: questionId,
      });
      if (error) throw error;
      return data as { liked: boolean };
    },
    onMutate: async ({ questionId, userId }) => {
      // Settle in-flight fetches of the keys we're about to write. The broad
      // ['questions'] lists are deliberately NOT cancelled — that would abort
      // an unrelated Load More page fetch mid-flight.
      await Promise.all([
        qc.cancelQueries({ queryKey: ['user_liked_question_ids', userId] }),
        qc.cancelQueries({ queryKey: ['question', questionId] }),
      ]);

      const prevLikedIds =
        qc.getQueryData<Set<string>>(['user_liked_question_ids', userId]) ?? new Set<string>();
      const isCurrentlyLiked = prevLikedIds.has(questionId);
      const delta = isCurrentlyLiked ? -1 : 1;

      // Update liked IDs set
      const next = new Set(prevLikedIds);
      isCurrentlyLiked ? next.delete(questionId) : next.add(questionId);
      qc.setQueryData(['user_liked_question_ids', userId], next);

      // Update upvote counts in every cached question list
      qc.setQueriesData<Question[]>(
        { queryKey: ['questions'], exact: false },
        (old) =>
          old?.map((q) =>
            q.id === questionId ? { ...q, upvotes: Math.max(0, (q.upvotes ?? 0) + delta) } : q,
          ),
      );
      // Update the detail cache too
      qc.setQueryData<Question>(['question', questionId], (old) =>
        old ? { ...old, upvotes: Math.max(0, (old.upvotes ?? 0) + delta) } : old,
      );

      return { prevLikedIds };
    },
    onError: (_err, vars, context) => {
      if (context?.prevLikedIds) {
        qc.setQueryData(['user_liked_question_ids', vars.userId], context.prevLikedIds);
      }
      qc.invalidateQueries({ queryKey: ['questions'] });
      // The detail cache got the optimistic delta too — refetch it, or the
      // detail page keeps showing the inflated count after a failed upvote.
      qc.invalidateQueries({ queryKey: ['question', vars.questionId] });
      toast.error('Failed to update like. Please try again.');
    },
    onSuccess: (data, { questionId, userId }, context) => {
      // Reconcile with the server's authoritative liked state — the same fix
      // useToggleQuestionLike got. onMutate flipped the ids set from a possibly
      // stale cache (a rapid double-click, or an empty set before the ids query
      // resolved), so if the server disagrees with that optimistic flip, correct
      // the set and refetch the counters it moved the wrong way.
      const optimisticLiked = !(context?.prevLikedIds?.has(questionId) ?? false);
      if (data.liked !== optimisticLiked) {
        qc.setQueryData<Set<string>>(['user_liked_question_ids', userId], (prev) => {
          const next = new Set(prev ?? []);
          if (data.liked) next.add(questionId);
          else next.delete(questionId);
          return next;
        });
        qc.invalidateQueries({ queryKey: ['questions'] });
        qc.invalidateQueries({ queryKey: ['question', questionId] });
      }
      // Sync per-question state used by the detail page
      qc.invalidateQueries({ queryKey: ['user_liked_question', questionId] });
    },
  });
}

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
