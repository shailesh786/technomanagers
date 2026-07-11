'use client';

/**
 * components/questions/QuestionCard.tsx  —  Client Component ✅
 *
 * Needs 'use client': useRouter() (navigation on click), useQuestionAccess()
 * (client context), onClick event handlers (upvote, save, card click).
 *
 * Changes from src/components/questions/QuestionCard.tsx:
 * - Added 'use client' directive
 * - `import { useNavigate } from 'react-router-dom'`
 *   → `import { useRouter } from 'next/navigation'`
 * - `const navigate = useNavigate()` → `const router = useRouter()`
 * - `navigate('/questions/id')` → `router.push('/questions/id')`
 * - `@/contexts/QuestionAccessContext` → `@/contexts/QuestionAccessContext` ✅
 * - `@/components/ui/badge` → `@/components/ui/badge` ✅
 * - `@/types` → `@/types` ✅
 * - All visual design UNCHANGED.
 */

import { useRouter } from 'next/navigation';
import { ThumbsUp, Bookmark, BookmarkCheck, Lock, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';

interface QuestionCardProps {
  question: Question;
  isSaved?: boolean;
  isLiked?: boolean;
  onUpvote: () => void;
  onToggleSave: () => void;
  isAuthenticated: boolean;
}

const difficultyColors: Record<string, string> = {
  Easy: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  Hard: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function QuestionCard({
  question,
  isSaved,
  isLiked,
  onUpvote,
  onToggleSave,
  isAuthenticated,
}: QuestionCardProps) {
  const router = useRouter();
  const { recordView, isExhausted } = useQuestionAccess();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const allowed = recordView(question.id);
    if (allowed) {
      router.push(`/questions/${question.id}`);
    }
  };

  // Show lock styling only for non-authed users who exhausted free views
  const showLock = !isAuthenticated && isExhausted;

  return (
    <div className="group relative rounded-xl border bg-background p-5 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Clickable body — everything above the footer navigates to the question */}
      <a href={`/questions/${question.id}`} onClick={handleClick} className="block cursor-pointer">
        {/* Company badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {question.company?.map((c) => (
            <Badge key={c} variant="secondary" className="text-xs font-medium">
              Asked at {c}
            </Badge>
          ))}
          {question.difficulty && (
            <Badge variant="outline" className={`text-xs ${difficultyColors[question.difficulty] || ''}`}>
              {question.difficulty}
            </Badge>
          )}
        </div>

        {/* Question text */}
        <h3 className="font-heading font-semibold text-base leading-relaxed group-hover:text-secondary transition-colors">
          {question.question_text}
        </h3>

        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {question.category?.map((cat) => (
            <span key={cat} className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {cat}
            </span>
          ))}
        </div>
      </a>

      {/* Stats row */}
      <div className={`flex items-center gap-4 mt-4 pt-3 border-t ${showLock ? 'relative' : ''}`}>
        <button
          onClick={onUpvote}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            isLiked
              ? 'text-primary hover:text-primary/80'
              : 'text-muted-foreground hover:text-secondary',
          )}
          aria-label={isLiked ? 'Unlike' : 'Upvote'}
        >
          <ThumbsUp className={cn('h-4 w-4', isLiked && 'fill-primary stroke-primary')} />
          <span>{question.upvotes || 0}</span>
        </button>
        <button
          onClick={onToggleSave}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors"
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-secondary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        {/* Community answers count — from the question_comments(count) embed.
            Conditional so any data path without the embed degrades gracefully. */}
        {typeof question.comment_count === 'number' && (
          <a
            href={`/questions/${question.id}#comments-section`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-colors"
            aria-label={`${question.comment_count} community answers`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{question.comment_count}</span>
          </a>
        )}

        {showLock && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Sign in to view
          </span>
        )}
      </div>

      {/* Blur overlay when gated */}
      {showLock && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-xl bg-gradient-to-t from-background/90 to-transparent" />
      )}
    </div>
  );
}
