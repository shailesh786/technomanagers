'use client';

/**
 * hooks/useQuestionCardActions.ts — the likes/saves wiring a QuestionCard
 * needs, exactly as /questions does it, so a card behaves identically
 * wherever it appears (listing, related clusters, hub pages).
 */

import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import { useUserLikedQuestionIds, useToggleLike } from '@/hooks/useLikes';

export function useQuestionCardActions() {
  const { user } = useAuth();
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const { data: likedIds = new Set<string>() } = useUserLikedQuestionIds(user?.id);
  const toggleLike = useToggleLike();
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();

  const handleUpvote = (id: string) => {
    if (!user) { toast.info('Sign in to upvote'); return; }
    toggleLike.mutate({ questionId: id, userId: user.id });
  };

  const handleToggleSave = (id: string) => {
    if (!user) { toast.info('Sign in to save questions'); return; }
    if (savedIds.includes(id)) unsave.mutate({ userId: user.id, questionId: id });
    else save.mutate({ userId: user.id, questionId: id });
  };

  return { isAuthenticated: !!user, savedIds, likedIds, handleUpvote, handleToggleSave };
}
