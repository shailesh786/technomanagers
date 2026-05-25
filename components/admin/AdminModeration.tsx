'use client';

import { useState } from 'react';
import { MessageSquare, Flag, Trash2, Shield, ExternalLink, ChevronLeft, ChevronRight, Search, MoreHorizontal, Clock, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  useModerationStats,
  useModerationComments,
  useAdminDeleteComment,
  useAdminToggleFlag,
  useAdminRestrictUser,
  useModerationLog,
  useQuestionsList,
  type ModerationComment,
} from '@/hooks/useModeration';
import { timeAgo } from '@/lib/timeAgo';
import { toast } from 'sonner';

type SubTab = 'comments' | 'log';

export default function AdminModeration() {
  const [subTab, setSubTab] = useState<SubTab>('comments');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="font-heading font-bold text-xl">Content Moderation</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setSubTab('comments')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'comments' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Comments
          </button>
          <button
            onClick={() => setSubTab('log')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'log' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Activity Log
          </button>
        </div>
      </div>

      {subTab === 'comments' ? <ModerationComments /> : <ModerationLogView />}
    </div>
  );
}

function ModerationComments() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useModerationStats();
  const { data: questionsList } = useQuestionsList();

  const [search, setSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'flagged' | 'deleted'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<ModerationComment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const filters = {
    search: search || undefined,
    questionId: questionFilter || undefined,
    status: statusFilter,
    sort: sortBy,
    page,
  };

  const { data: result, isLoading } = useModerationComments(filters);
  const comments = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const adminDelete = useAdminDeleteComment();
  const adminFlag = useAdminToggleFlag();
  const adminRestrict = useAdminRestrictUser();

  const handleDelete = () => {
    if (!deleteTarget || !user) return;
    adminDelete.mutate(
      { commentId: deleteTarget.id, adminId: user.id, reason: deleteReason, commentSnapshot: deleteTarget.content },
      { onSuccess: () => { toast.success('Comment deleted'); setDeleteTarget(null); setDeleteReason(''); } }
    );
  };

  const handleFlag = (comment: ModerationComment) => {
    if (!user) return;
    adminFlag.mutate(
      { commentId: comment.id, adminId: user.id, flag: !comment.is_flagged },
      { onSuccess: () => toast.success(comment.is_flagged ? 'Comment unflagged' : 'Comment flagged') }
    );
  };

  const handleRestrict = (comment: ModerationComment) => {
    if (!user) return;
    adminRestrict.mutate(
      { userId: comment.user_id, adminId: user.id, restrict: true },
      { onSuccess: () => toast.success('User restricted from commenting') }
    );
  };

  const statCards = [
    { label: 'Total Comments', value: stats?.total ?? '—', icon: MessageSquare, color: 'text-foreground' },
    { label: 'Comments Today', value: stats?.today ?? '—', icon: Clock, color: 'text-secondary' },
    { label: 'Flagged', value: stats?.flagged ?? '—', icon: AlertTriangle, color: (stats?.flagged || 0) > 0 ? 'text-warning' : 'text-muted-foreground' },
    { label: 'Deleted This Week', value: stats?.deletedThisWeek ?? '—', icon: Trash2, color: 'text-muted-foreground' },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              {statsLoading ? <Skeleton className="h-10 w-full" /> : (
                <>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comment content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <select
          value={questionFilter}
          onChange={(e) => { setQuestionFilter(e.target.value); setPage(0); }}
          className="h-10 rounded-md border bg-background px-3 text-sm min-w-[180px]"
        >
          <option value="">All Questions</option>
          {questionsList?.map((q) => (
            <option key={q.id} value={q.id}>{q.question_text.slice(0, 60)}...</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="deleted">Deleted</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No comments found.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const statusBadge = comment.deleted_at
              ? <Badge variant="destructive" className="text-[10px]">Deleted</Badge>
              : comment.is_flagged
              ? <Badge className="bg-warning text-warning-foreground text-[10px]">Flagged</Badge>
              : <Badge variant="secondary" className="text-[10px]">Active</Badge>;

            return (
              <Card key={comment.id} className={`${comment.is_flagged && !comment.deleted_at ? 'border-warning/50 bg-warning/5' : ''} ${comment.deleted_at ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  {/* User info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment.profile?.avatar_url || ''} referrerPolicy="no-referrer" />
                        <AvatarFallback className="text-[10px]">{comment.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-semibold">{comment.profile?.full_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{comment.profile?.email}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                      {statusBadge}
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/questions/${comment.question_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="View in context"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {!comment.deleted_at && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleFlag(comment)}
                            title={comment.is_flagged ? 'Unflag' : 'Flag'}
                            className={comment.is_flagged ? 'text-warning' : 'text-muted-foreground'}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(comment)}
                            className="text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRestrict(comment)} className="text-destructive">
                                <Shield className="h-4 w-4 mr-2" /> Restrict user from commenting
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Question context */}
                  <p className="text-xs text-muted-foreground">
                    On:{' '}
                    <a href={`/questions/${comment.question_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {(comment.question as any)?.question_text?.slice(0, 100) || 'Unknown question'}...
                    </a>
                  </p>

                  {comment.parent_id && (
                    <p className="text-xs text-muted-foreground italic ml-2">↩ Reply to a comment</p>
                  )}

                  {/* Comment content */}
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total comments</p>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page + 1} of {totalPages}</span>
            <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this comment?</DialogTitle>
            <DialogDescription>This will permanently remove the comment. The user will not be notified.</DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
            {deleteTarget?.content}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Reason (optional)</label>
            <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Why is this being deleted?" className="min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={adminDelete.isPending}>
              {adminDelete.isPending ? 'Deleting...' : 'Delete Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModerationLogView() {
  const [page, setPage] = useState(0);
  const [actionType, setActionType] = useState('all');

  const { data: result, isLoading } = useModerationLog({ page, actionType });
  const entries = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const actionLabels: Record<string, string> = {
    delete: 'Deleted comment',
    flag: 'Flagged comment',
    unflag: 'Unflagged comment',
    restore: 'Restored user',
    ban_user: 'Restricted user',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={actionType}
          onChange={(e) => { setActionType(e.target.value); setPage(0); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Actions</option>
          <option value="delete">Deletions</option>
          <option value="flag">Flags</option>
          <option value="unflag">Unflags</option>
          <option value="ban_user">User Restrictions</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No moderation activity yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={entry.admin?.avatar_url || ''} referrerPolicy="no-referrer" />
                  <AvatarFallback className="text-[10px]">{entry.admin?.full_name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{entry.admin?.full_name || 'Admin'}</span>
                    {' · '}
                    <span className="text-muted-foreground">{actionLabels[entry.action] || entry.action}</span>
                  </p>
                  {entry.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {entry.reason}</p>}
                  {entry.metadata?.comment_text_snapshot && (
                    <details className="mt-1">
                      <summary className="text-xs text-primary cursor-pointer">View deleted comment</summary>
                      <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded whitespace-pre-wrap">
                        {entry.metadata.comment_text_snapshot}
                      </p>
                    </details>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(entry.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {page + 1} of {totalPages}</span>
          <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
