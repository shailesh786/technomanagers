'use client';


import { useMemo, useState, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import { useComments, useCommentCount, useAddComment, useQuestionReplies } from '@/hooks/useComments';
import { useCommentLikeCounts, useUserLikedComments } from '@/hooks/useLikes';
import { groupRepliesByParent } from '@/lib/comments-query';
import CommentItem from '@/components/questions/CommentItem';
import { toast } from 'sonner';

interface CommentsSectionProps {
  questionId: string;
}

export default function CommentsSection({ questionId }: CommentsSectionProps) {
  const { user, profile } = useAuth();
  const { setGateOpen } = useQuestionAccess();
  const [commentText, setCommentText] = useState('');
  const [sort, setSort] = useState<'newest' | 'top'>('newest');
  const sectionRef = useRef<HTMLDivElement>(null);

  const { data: commentCount = 0 } = useCommentCount(questionId);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useComments(questionId, sort);
  const addComment = useAddComment();

  const comments = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // One request for every reply on the question, and ONE like-counts +
  // ONE user-liked query covering every visible comment and reply — instead
  // of each CommentItem fetching its own (≈50 requests on a busy page).
  const { data: replyRows } = useQuestionReplies(questionId);
  const repliesByParent = useMemo(() => groupRepliesByParent(replyRows ?? []), [replyRows]);
  const visibleIds = useMemo(
    () => [...comments, ...(replyRows ?? [])].map((c) => c.id).sort(),
    [comments, replyRows],
  );
  const { data: likeCounts = {} } = useCommentLikeCounts(visibleIds);
  const { data: likedSet = new Set<string>() } = useUserLikedComments(visibleIds, user?.id);

  const handlePost = () => {
    if (!user) { setGateOpen(true); return; }
    if (!commentText.trim()) return;
    addComment.mutate(
      { questionId, userId: user.id, content: commentText.trim() },
      { onSuccess: () => { setCommentText(''); toast.success('Comment posted'); } }
    );
  };

  return (
    <div ref={sectionRef} id="comments-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Community Answers ({commentCount})
        </h2>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setSort('newest')}
            className={`px-2 py-1 rounded ${sort === 'newest' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Newest
          </button>
          <button
            onClick={() => setSort('top')}
            className={`px-2 py-1 rounded ${sort === 'top' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Top
          </button>
        </div>
      </div>

      {/* Comment input */}
      <div className="flex gap-3">
        {user ? (
          profile?.commenting_disabled ? (
            <div className="w-full p-4 rounded-lg bg-muted text-sm text-muted-foreground text-center">
              Your commenting ability has been restricted. Contact support if you believe this is a mistake.
            </div>
          ) : (
            <>
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                <AvatarImage src={profile?.avatar_url || ''} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-xs">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your approach or ask a question..."
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button onClick={handlePost} disabled={addComment.isPending || !commentText.trim()}>
                    Post Answer
                  </Button>
                </div>
              </div>
            </>
          )
        ) : (
          <div className="w-full relative">
            <Textarea
              disabled
              placeholder="Share your approach or ask a question..."
              className="min-h-[80px] opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setGateOpen(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Sign in to share your answer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="divide-y">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            questionId={questionId}
            replies={repliesByParent[comment.id]}
            likeCounts={likeCounts}
            likedSet={likedSet}
          />
        ))}
      </div>

      {!isPending && comments.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          No answers yet. Be the first to share your approach!
        </p>
      )}

      {hasNextPage && (
        <div className="text-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading...' : 'Load more comments'}
          </Button>
        </div>
      )}
    </div>
  );
}
