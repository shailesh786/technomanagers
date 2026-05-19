import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export interface Comment {
  id: string;
  question_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  like_count: number;
  user_liked: boolean;
  replies?: Comment[];
}

const PAGE_SIZE = 10;

async function enrichWithProfiles(comments: any[]) {
  if (!comments || comments.length === 0) return [];
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);
  const profileMap: Record<string, any> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });
  return comments.map(c => ({
    ...c,
    profile: profileMap[c.user_id] || { full_name: 'Anonymous', avatar_url: null },
  }));
}

export function useComments(questionId: string, sort: 'newest' | 'top' = 'newest') {
  return useInfiniteQuery({
    queryKey: ['comments', questionId, sort],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('question_comments')
        .select('*')
        .eq('question_id', questionId)
        .is('parent_id', null)
        .is('deleted_at', null)
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      query = query.order('created_at', { ascending: sort !== 'newest' });

      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch comments:', error);
        throw error;
      }
      const enriched = await enrichWithProfiles(data || []);
      return { data: enriched, nextOffset: pageParam + PAGE_SIZE };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < PAGE_SIZE) return undefined;
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
    enabled: !!questionId,
  });
}

export function useCommentReplies(parentId: string) {
  return useQuery({
    queryKey: ['comment_replies', parentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_comments')
        .select('*')
        .eq('parent_id', parentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Failed to fetch replies:', error);
        throw error;
      }
      return enrichWithProfiles(data || []);
    },
    enabled: !!parentId,
  });
}

export function useCommentCount(questionId: string) {
  return useQuery({
    queryKey: ['comment_count', questionId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('question_comments')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', questionId)
        .is('deleted_at', null);
      if (error) {
        console.error('Failed to fetch comment count:', error);
        throw error;
      }
      return count || 0;
    },
    enabled: !!questionId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, userId, content, parentId }: {
      questionId: string; userId: string; content: string; parentId?: string;
    }) => {
      const { error } = await supabase.from('question_comments').insert({
        question_id: questionId,
        user_id: userId,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.questionId] });
      qc.invalidateQueries({ queryKey: ['comment_count', vars.questionId] });
      if (vars.parentId) qc.invalidateQueries({ queryKey: ['comment_replies', vars.parentId] });
    },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from('question_comments').update({ content }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['comment_replies'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('question_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['comment_count'] });
      qc.invalidateQueries({ queryKey: ['comment_replies'] });
    },
  });
}
