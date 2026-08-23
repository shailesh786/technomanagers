'use client';

/**
 * components/questions/QuestionPager.tsx — "← Previous question / Next
 * question →" under the related clusters. The pair chains every published
 * question in newest-first order (see getNeighbours in the route), so a
 * crawler — or a reader — can walk the whole bank from any entry point.
 *
 * Navigation goes through the free-view gate first, exactly as QuestionCard
 * does: the href is real for crawlers, the click records a view and only
 * then routes.
 */

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import type { NeighbourQuestion, QuestionNeighbours } from '@/lib/related-questions';

function PagerLink({
  question,
  direction,
}: {
  question: NeighbourQuestion;
  direction: 'prev' | 'next';
}) {
  const router = useRouter();
  const { recordView } = useQuestionAccess();
  const href = `/questions/${question.id}`;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (recordView(question.id)) router.push(href);
  };

  return (
    <a
      href={href}
      rel={direction}
      onClick={handleClick}
      className={`flex-1 rounded-xl border bg-background px-4 py-3.5 hover:shadow-md transition-shadow ${
        direction === 'next' ? 'text-right' : ''
      }`}
    >
      <span className="block text-xs text-muted-foreground mb-1">
        {direction === 'prev' ? '← Previous question' : 'Next question →'}
      </span>
      <span className="block font-heading font-semibold text-sm leading-normal">{question.question_text}</span>
    </a>
  );
}

export default function QuestionPager({ prev, next }: QuestionNeighbours) {
  if (!prev && !next) return null;

  return (
    <nav aria-label="Previous and next question" className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
      {prev ? <PagerLink question={prev} direction="prev" /> : <span aria-hidden="true" className="flex-1" />}
      {next ? <PagerLink question={next} direction="next" /> : <span aria-hidden="true" className="flex-1" />}
    </nav>
  );
}
