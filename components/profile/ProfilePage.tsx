'use client';

/**
 * components/profile/ProfilePage.tsx  —  Client Component ✅
 *
 * Migrated from src/_vite-pages/Profile.tsx.
 * Changes:
 * - 'use client' added
 * - react-router-dom useSearchParams → next/navigation useSearchParams + useRouter
 * - react-router-dom Navigate → router.replace on redirect
 * - react-router-dom Link → next/link Link  |  to → href
 * - Hook imports: @src/hooks/...
 * - Context import: @/contexts/AuthContext (migrated)
 * - All logic, JSX, and visual design UNCHANGED.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bookmark, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSavedQuestionsWithDetails, useUserComments } from '@/hooks/useProfile';
import { useUserLikedQuestions } from '@/hooks/useLikes';
import { useUnsaveQuestion } from '@/hooks/useQuestions';
import { useDeleteComment } from '@/hooks/useComments';
import { timeAgo } from '@/lib/timeAgo';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'saved';

  const { user, profile, isLoading: authLoading } = useAuth();

  const { data: savedItems = [] } = useUserSavedQuestionsWithDetails(user?.id);
  const { data: likedItems = [] } = useUserLikedQuestions(user?.id);
  const { data: commentItems = [] } = useUserComments(user?.id);
  const unsave = useUnsaveQuestion();
  const deleteComment = useDeleteComment();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  }
  if (!user) return null;

  const handleTabChange = (tab: string) => {
    router.push(`/profile?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url || ''} referrerPolicy="no-referrer" />
          <AvatarFallback className="text-2xl font-bold">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-heading font-bold text-2xl">{profile?.full_name || 'User'}</h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          {profile?.created_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
            </p>
          )}
        </div>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="saved" className="gap-1.5"><Bookmark className="h-3.5 w-3.5" /> Saved</TabsTrigger>
          <TabsTrigger value="likes" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Likes</TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Comments</TabsTrigger>
        </TabsList>

        {/* Saved Questions */}
        <TabsContent value="saved">
          {savedItems.length === 0 ? (
            <EmptyState text="No saved questions yet. Browse questions and save the ones you want to revisit." />
          ) : (
            <div className="divide-y">
              {savedItems.map((item: any) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-3">
                  <Link href={`/questions/${item.question?.id}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                    <p className="font-medium text-sm line-clamp-2">{item.question?.question_text}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.question?.company?.map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                      {item.question?.category?.map((c: string) => <span key={c} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{c}</span>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Saved {timeAgo(item.created_at)}</p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => unsave.mutate({ userId: user.id, questionId: item.question_id }, {
                      onSuccess: () => toast.success('Unsaved'),
                    })}
                  >
                    <Bookmark className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Likes */}
        <TabsContent value="likes">
          {likedItems.length === 0 ? (
            <EmptyState text="No liked questions yet." />
          ) : (
            <div className="divide-y">
              {likedItems.map((item: any) => (
                <Link key={item.question_id} href={`/questions/${item.question?.id}`} className="block py-4 hover:text-primary transition-colors">
                  <p className="font-medium text-sm line-clamp-2">{item.question?.question_text}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.question?.company?.map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Liked {timeAgo(item.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          {commentItems.length === 0 ? (
            <EmptyState text="No comments yet. Join the discussion on any question." />
          ) : (
            <div className="divide-y">
              {commentItems.map((item: any) => (
                <div key={item.id} className="py-4">
                  <Link href={`/questions/${item.question?.id}`} className="text-xs text-primary hover:underline font-medium">
                    {item.question?.question_text}
                  </Link>
                  <p className="text-sm mt-1 line-clamp-2">{item.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                    <button
                      onClick={() => deleteComment.mutate(item.id, { onSuccess: () => toast.success('Deleted') })}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href="/questions">
        <Button variant="outline" className="mt-4" size="sm">Browse Questions</Button>
      </Link>
    </div>
  );
}
