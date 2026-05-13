import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Bookmark, BookmarkCheck, MessageCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuestion, useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import { useQuestionLikeCount, useUserLikedQuestion, useToggleQuestionLike } from '@/hooks/useLikes';
import { useCommentCount } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import SignInGateModal from '@/components/questions/SignInGateModal';
import CommentsSection from '@/components/questions/CommentsSection';

const difficultyColors: Record<string, string> = {
  Easy: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  Hard: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: question, isLoading } = useQuestion(id!);
  const { user } = useAuth();
  const { recordView, isExhausted, setGateOpen } = useQuestionAccess();
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();
  const [showAnswer, setShowAnswer] = useState(false);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  // Likes
  const { data: likeCount = 0 } = useQuestionLikeCount(id!);
  const { data: userLiked = false } = useUserLikedQuestion(id!, user?.id);
  const toggleLike = useToggleQuestionLike();

  // Comment count
  const { data: commentCount = 0 } = useCommentCount(id!);

  useEffect(() => {
    if (id) {
      const allowed = recordView(id);
      setAccessGranted(allowed);
      if (!allowed) {
        navigate('/questions', { replace: true });
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
        <Link to="/questions"><Button variant="outline" className="mt-4">Back to Questions</Button></Link>
      </div>
    );
  }

  const isSaved = savedIds.includes(question.id);

  const requireAuth = (action: () => void) => {
    if (!user) { setGateOpen(true); return; }
    action();
  };

  const handleLike = () => requireAuth(() => {
    toggleLike.mutate({ questionId: question.id, userId: user!.id, liked: userLiked });
  });

  const handleToggleSave = () => requireAuth(() => {
    if (isSaved) unsave.mutate({ userId: user!.id, questionId: question.id });
    else save.mutate({ userId: user!.id, questionId: question.id });
  });

  const handleShowAnswer = () => {
    if (!user && isExhausted) { setGateOpen(true); return; }
    setShowAnswer(!showAnswer);
  };

  const scrollToComments = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container py-8 max-w-3xl">
      <SignInGateModal />
      <Link to="/questions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Questions
      </Link>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap gap-2">
          {question.company?.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
          {question.difficulty && <Badge variant="outline" className={difficultyColors[question.difficulty] || ''}>{question.difficulty}</Badge>}
        </div>

        <h1 className="font-heading font-extrabold text-2xl md:text-3xl leading-tight">{question.question_text}</h1>

        <div className="flex flex-wrap gap-2">
          {question.category?.map((cat) => <span key={cat} className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground">{cat}</span>)}
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 py-4 border-y">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleLike} className="gap-1.5">
                <Heart className={`h-4 w-4 ${userLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount}
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

        {/* Answer */}
        {question.sample_answer && (
          <div className="rounded-xl border">
            <button onClick={handleShowAnswer} className="w-full flex items-center justify-between p-4 text-left font-heading font-semibold">
              <span className="flex items-center gap-2">
                {!user && isExhausted && <Lock className="h-4 w-4 text-muted-foreground" />}
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </span>
              {showAnswer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAnswer && (
              <div className="px-4 pb-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {question.sample_answer}
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <CommentsSection questionId={question.id} />
      </div>
    </div>
  );
}
