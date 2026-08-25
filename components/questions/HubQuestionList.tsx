'use client';

/**
 * components/questions/HubQuestionList.tsx — the question cards on a hub
 * page. Rows arrive as props from the server route, so every card is in the
 * initial HTML; the cards are the same QuestionCard as everywhere else.
 */

import QuestionCard from '@/components/questions/QuestionCard';
import { useQuestionCardActions } from '@/hooks/useQuestionCardActions';
import type { Question } from '@/types';

export default function HubQuestionList({ questions }: { questions: Question[] }) {
  const { isAuthenticated, savedIds, likedIds, handleUpvote, handleToggleSave } = useQuestionCardActions();

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          isSaved={savedIds.includes(q.id)}
          isLiked={likedIds.has(q.id)}
          onUpvote={() => handleUpvote(q.id)}
          onToggleSave={() => handleToggleSave(q.id)}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
