'use client';


import { useState } from 'react';
import { Heart, Reply, Trash2, Pencil, MoreHorizontal, Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import { useAddComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useToggleCommentLike } from '@/hooks/useLikes';
import type { Comment } from '@/lib/comments-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();
import RelativeTime from '@/components/RelativeTime';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Replies and like state are fetched ONCE per page by CommentsSection and
// passed down — a CommentItem must not fetch its own (that's what caused
// ~50 requests per commented page).
interface CommentItemProps {
  comment: any;
  questionId: string;
  isReply?: boolean;
  /** This comment's replies (omitted for reply items — no nesting below one level). */
  replies?: Comment[];
  likeCounts: Record<string, number>;
  likedSet: Set<string>;
}

export default function CommentItem({
  comment,
  questionId,
  isReply = false,
  replies,
  likeCounts,
  likedSet,
}: CommentItemProps) {
  const { user, profile } = useAuth();
  const { setGateOpen } = useQuestionAccess();
  const queryClient = useQueryClient();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const addComment = useAddComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleLike = useToggleCommentLike();

  const isOwner = user?.id === comment.user_id;
  const liked = likedSet.has(comment.id);
  const likeCount = likeCounts[comment.id] || 0;

  const handleLike = () => {
    if (!user) { setGateOpen(true); return; }
    toggleLike.mutate({ commentId: comment.id, userId: user.id, liked });
  };

  const handleReply = () => {
    if (!user) { setGateOpen(true); return; }
    setShowReplyInput(!showReplyInput);
  };

  const submitReply = () => {
    if (!user || !replyText.trim()) return;
    const parentId = comment.parent_id || comment.id;
    addComment.mutate(
      { questionId, userId: user.id, content: replyText.trim(), parentId },
      { onSuccess: () => { setReplyText(''); setShowReplyInput(false); toast.success('Reply posted'); } }
    );
  };

  const submitEdit = () => {
    if (!editText.trim()) return;
    updateComment.mutate(
      { id: comment.id, content: editText.trim() },
      { onSuccess: () => { setIsEditing(false); toast.success('Comment updated'); } }
    );
  };

  const confirmDelete = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => { toast.success('Comment deleted'); setShowDeleteConfirm(false); },
    });
  };

  const handleReport = async () => {
    if (!user) return;
    setIsReporting(true);
    try {
      const { error } = await (supabase as any).rpc('flag_comment', {
        p_comment_id: comment.id,
        p_reason: reportReason,
        p_details: reportDetails.trim() || null,
      });
      if (error) throw error;

      toast.success('Thanks for reporting. Our team will review this comment.');
      setShowReportDialog(false);
      setReportReason('Spam');
      setReportDetails('');
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      // Replies render from ['comment_replies', questionId] (PR #43 batching) —
      // without this a reported REPLY's is_flagged never refreshes, so the
      // "Already reported" state and re-report guard don't update on it.
      queryClient.invalidateQueries({ queryKey: ['comment_replies', questionId] });
      queryClient.invalidateQueries({ queryKey: ['flagged-count'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to report comment');
    } finally {
      setIsReporting(false);
    }
  };

  const profileData = comment.profile;
  const alreadyFlagged = comment.is_flagged;

  return (
    <div id={`comment-${comment.id}`} className={isReply ? 'ml-8 md:ml-10 pl-4 border-l-2 border-border' : ''}>
      <div className="flex gap-3 py-4">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profileData?.avatar_url || ''} referrerPolicy="no-referrer" />
          <AvatarFallback className="text-xs">{profileData?.full_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{profileData?.full_name || 'User'}</span>
              <RelativeTime date={comment.created_at} className="text-muted-foreground text-xs" />
            </div>
            {user && !isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {alreadyFlagged ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      <Flag className="h-4 w-4 mr-2" /> Already reported
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                      <Flag className="h-4 w-4 mr-2" /> Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[60px]" />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitEdit} disabled={updateComment.isPending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditText(comment.content); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={handleLike} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount > 0 && likeCount}
              </button>
              {!isReply && (
                <button onClick={handleReply} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Reply className="h-3.5 w-3.5" /> Reply
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="mt-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
              <p className="text-destructive font-medium">Delete this comment?</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={deleteComment.isPending}>Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={profile?.avatar_url || ''} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-[10px]">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="min-h-[50px] text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitReply} disabled={addComment.isPending || !replyText.trim()}>Post</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowReplyInput(false); setReplyText(''); }}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {!isReply && replies && replies.length > 0 && (
            <div className="mt-2">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  questionId={questionId}
                  isReply
                  likeCounts={likeCounts}
                  likedSet={likedSet}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why are you reporting this comment?</DialogTitle>
            <DialogDescription>Our team will review this comment and take action if needed.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
            {['Spam', 'Harassment', 'Off-topic', 'Misinformation', 'Other'].map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`}>{r}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Additional details (optional)"
            className="min-h-[60px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={isReporting}>
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
