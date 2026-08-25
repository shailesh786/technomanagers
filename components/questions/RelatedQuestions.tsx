'use client';

/**
 * components/questions/RelatedQuestions.tsx — the related clusters under the
 * community answers on a question detail page, plus the previous/next pair.
 *
 * The clusters arrive as props from the server route (lib/related-questions.ts
 * chooses them), so every card and "View all" link is in the initial HTML.
 * Cards are the same QuestionCard the /questions list renders, wired to the
 * same like/save handlers, so a card behaves identically wherever it appears.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import QuestionCard from '@/components/questions/QuestionCard';
import QuestionPager from '@/components/questions/QuestionPager';
import { useQuestionCardActions } from '@/hooks/useQuestionCardActions';
import { viewAllLabel, type QuestionNeighbours, type RelatedCluster } from '@/lib/related-questions';

interface Props {
  clusters: RelatedCluster[];
  neighbours: QuestionNeighbours;
}

export default function RelatedQuestions({ clusters, neighbours }: Props) {
  const { isAuthenticated, savedIds, likedIds, handleUpvote, handleToggleSave } = useQuestionCardActions();

  const hasNeighbours = Boolean(neighbours.prev || neighbours.next);
  if (!clusters.length && !hasNeighbours) return null;

  return (
    // `!mt-10`: the parent's space-y-4 sets margin-top on every child with a
    // higher-specificity selector, and the design wants the larger gap here.
    <div className="!mt-10 pt-8 border-t space-y-8">
      {clusters.map((cluster) => (
        <section key={cluster.kind} aria-labelledby={`related-${cluster.kind}`}>
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 id={`related-${cluster.kind}`} className="font-heading font-bold text-xl leading-tight">
              {cluster.heading}
            </h2>
            <Link
              href={cluster.viewAllHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary whitespace-nowrap transition-colors"
            >
              {viewAllLabel(cluster.total)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-3">
            {cluster.items.map((q) => (
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
        </section>
      ))}

      <QuestionPager prev={neighbours.prev} next={neighbours.next} />
    </div>
  );
}
