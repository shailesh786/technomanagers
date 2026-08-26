'use client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Heart, Bookmark, BookmarkCheck, MessageCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuestion, useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import { useUserLikedQuestion, useToggleQuestionLike } from '@/hooks/useLikes';
import { useCommentCount } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import CommentsSection from '@/components/questions/CommentsSection';
import RelatedQuestions from '@/components/questions/RelatedQuestions';
import { categoryHref, companyHref, type QuestionNeighbours, type RelatedCluster } from '@/lib/related-questions';

const difficultyColors: Record<string, string> = {
  Easy: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  Hard: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface Props {
  id: string;
  /** Server-chosen related clusters and previous/next pair (lib/related-questions.ts). */
  clusters: RelatedCluster[];
  neighbours: QuestionNeighbours;
}

export default function QuestionDetailClient({ id, clusters, neighbours }: Props) {
  const router = useRouter();
  const { data: question, isLoading } = useQuestion(id);
  const { user } = useAuth();
  const { recordView, isExhausted, isViewed, setGateOpen } = useQuestionAccess();
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();
  const [showAnswer, setShowAnswer] = useState(false);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  // Likes — the displayed count is question.upvotes (the counter column),
  // the SAME source the list/homepage cards render. Previously this page
  // counted question_likes rows directly, which diverged from the cards
  // whenever the counter and the rows fell out of sync.
  const { data: userLiked = false } = useUserLikedQuestion(id, user?.id);
  const toggleLike = useToggleQuestionLike();

  // Comment count
  const { data: commentCount = 0 } = useCommentCount(id);

  useEffect(() => {
    if (id) {
      const allowed = recordView(id);
      setAccessGranted(allowed);
      if (!allowed) {
        router.replace('/questions');
      }
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessGranted === false) return null;

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg text-muted-foreground">Question not found.</p>
        <Link href="/questions">
          <Button variant="outline" className="mt-4">Back to Questions</Button>
        </Link>
      </div>
    );
  }

  const isSaved = savedIds.includes(question.id);

  const requireAuth = (action: () => void) => {
    if (!user) { setGateOpen(true); return; }
    action();
  };

  const handleLike = () => requireAuth(() => {
    toggleLike.mutate({ questionId: question.id, userId: user!.id });
  });

  const handleToggleSave = () => requireAuth(() => {
    if (isSaved) unsave.mutate({ userId: user!.id, questionId: question.id });
    else save.mutate({ userId: user!.id, questionId: question.id });
  });

  const handleShowAnswer = () => {
    // An already-viewed question keeps its answer readable even after the
    // free views run out — visitors get a true maxFreeViews answers.
    if (!user && isExhausted && !isViewed(question.id)) { setGateOpen(true); return; }
    setShowAnswer(!showAnswer);
  };

  const scrollToComments = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const primaryCategory = question.category?.[0];

  return (
    <div className="container py-8 max-w-3xl">
      {/* Breadcrumbs — mirrored by the BreadcrumbList JSON-LD the server route emits */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li><Link href="/questions" className="hover:text-foreground">Questions</Link></li>
          {primaryCategory && (
            <>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link href={categoryHref(primaryCategory)} className="hover:text-foreground">
                  {primaryCategory}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li aria-current="page" className="truncate max-w-[16rem] text-foreground">{question.question_text}</li>
        </ol>
      </nav>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap gap-2">
          {question.company?.map((c) => (
            <Link key={c} href={companyHref(c)} className={badgeVariants({ variant: 'secondary' })}>
              {c}
            </Link>
          ))}
          {question.difficulty && (
            <Badge variant="outline" className={difficultyColors[question.difficulty] || ''}>
              {question.difficulty}
            </Badge>
          )}
        </div>

        <h1 className="font-heading font-extrabold text-2xl md:text-3xl leading-tight">
          {question.question_text}
        </h1>

        <div className="flex flex-wrap gap-2">
          {question.category?.map((cat) => (
            <Link
              key={cat}
              href={categoryHref(cat)}
              className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 py-4 border-y">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleLike} className="gap-1.5">
                <Heart className={`h-4 w-4 ${userLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {question.upvotes ?? 0}
              </Button>
            </TooltipTrigger>
            {!user && <TooltipContent>Sign in to like</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleToggleSave} className="gap-1.5">
                {isSaved ? <BookmarkCheck className="h-4 w-4 text-secondary" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </TooltipTrigger>
            {!user && <TooltipContent>Sign in to save</TooltipContent>}
          </Tooltip>

          <Button variant="outline" size="sm" onClick={scrollToComments} className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {commentCount}
          </Button>
        </div>

        {/* Answer — trimmed check so a whitespace-only sample answer doesn't
            render an empty toggle (the JSON-LD trims the same way). */}
        {!!question.sample_answer?.trim() && (
          <div className="rounded-xl border">
            <button
              onClick={handleShowAnswer}
              aria-expanded={showAnswer}
              aria-controls="sample-answer"
              className="w-full flex items-center justify-between p-4 text-left font-heading font-semibold"
            >
              <span className="flex items-center gap-2">
                {!user && isExhausted && !isViewed(question.id) && <Lock className="h-4 w-4 text-muted-foreground" />}
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </span>
              {showAnswer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {/* Rendered whether or not it is revealed, so the answer is in the
                server HTML. `.question-answer` is the paywall selector in the
                route's JSON-LD. */}
            <div
              id="sample-answer"
              hidden={!showAnswer}
              className="question-answer px-4 pb-4 text-muted-foreground leading-relaxed whitespace-pre-wrap"
            >
              {question.sample_answer}
            </div>
          </div>
        )}

        {/* Comments */}
        <CommentsSection questionId={question.id} />

        {/* Related clusters + previous/next, below the community answers */}
        <RelatedQuestions clusters={clusters} neighbours={neighbours} />
      </div>
    </div>
  );
}
