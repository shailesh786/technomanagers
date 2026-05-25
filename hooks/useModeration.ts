import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();

export function useFlaggedCount(enabled: boolean = true) {
  return useQuery({
    queryKey: ['flagged-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('question_comments')
        .select('id', { count: 'exact', head: true })
        .eq('is_flagged', true)
        .is('deleted_at', null);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: enabled ? 30000 : false,
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['moderation-stats'],
    queryFn: async () => {
      const [totalRes, todayRes, flaggedRes, deletedRes] = await Promise.all([
        supabase.from('question_comments').select('id', { count: 'exact', head: true }),
        supabase.from('question_comments').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
        supabase.from('question_comments').select('id', { count: 'exact', head: true })
          .eq('is_flagged', true).is('deleted_at', null),
        supabase.from('moderation_log').select('id', { count: 'exact', head: true })
          .eq('action', 'delete')
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        flagged: flaggedRes.count || 0,
        deletedThisWeek: deletedRes.count || 0,
      };
    },
  });
}

export interface ModerationComment {
  id: string;
  content: string;
  created_at: string;
  is_flagged: boolean;
  flagged_at: string | null;
  deleted_at: string | null;
  deletion_reason: string | null;
  user_id: string;
  question_id: string;
  parent_id: string | null;
  profile: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
  question: { question_text: string } | null;
}

interface ModerationFilters {
  search?: string;
  questionId?: string;
  userSearch?: string;
  status?: 'all' | 'active' | 'flagged' | 'deleted';
  sort?: string;
  page?: number;
}

const PAGE_SIZE = 20;

export function useModerationComments(filters: ModerationFilters) {
  return useQuery({
    queryKey: ['moderation-comments', filters],
    queryFn: async () => {
      let query = supabase
        .from('question_comments')
        .select('*, profile:profiles!question_comments_user_id_fkey(full_name, avatar_url, email), question:questions!question_comments_question_id_fkey(question_text)', { count: 'exact' });

      if (filters.search) {
        query = query.ilike('content', `%${filters.search}%`);
      }
      if (filters.questionId) {
        query = query.eq('question_id', filters.questionId);
      }
      if (filters.status === 'active') {
        query = query.eq('is_flagged', false).is('deleted_at', null);
      } else if (filters.status === 'flagged') {
        query = query.eq('is_flagged', true).is('deleted_at', null);
      } else if (filters.status === 'deleted') {
        query = query.not('deleted_at', 'is', null);
      }

      const ascending = filters.sort === 'oldest';
      query = query.order('created_at', { ascending });

      const page = filters.page || 0;
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as ModerationComment[], total: count || 0 };
    },
  });
}

export function useAdminDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, adminId, reason, commentSnapshot }: {
      commentId: string; adminId: string; reason?: string; commentSnapshot: string;
    }) => {
      const { error: updateErr } = await supabase
        .from('question_comments')
        .update({ deleted_at: new Date().toISOString(), deleted_by: adminId, deletion_reason: reason || null })
        .eq('id', commentId);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase.from('moderation_log').insert({
        admin_id: adminId,
        comment_id: commentId,
        action: 'delete',
        reason,
        metadata: { comment_text_snapshot: commentSnapshot },
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moderation-comments'] });
      qc.invalidateQueries({ queryKey: ['moderation-stats'] });
      qc.invalidateQueries({ queryKey: ['flagged-count'] });
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['comment_count'] });
    },
  });
}

export function useAdminToggleFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, adminId, flag }: { commentId: string; adminId: string; flag: boolean }) => {
      const { error: updateErr } = await supabase
        .from('question_comments')
        .update({
          is_flagged: flag,
          flagged_at: flag ? new Date().toISOString() : null,
          flagged_by: flag ? adminId : null,
        })
        .eq('id', commentId);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase.from('moderation_log').insert({
        admin_id: adminId,
        comment_id: commentId,
        action: flag ? 'flag' : 'unflag',
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moderation-comments'] });
      qc.invalidateQueries({ queryKey: ['moderation-stats'] });
      qc.invalidateQueries({ queryKey: ['flagged-count'] });
    },
  });
}

export function useAdminRestrictUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, adminId, restrict }: { userId: string; adminId: string; restrict: boolean }) => {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ commenting_disabled: restrict })
        .eq('id', userId);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase.from('moderation_log').insert({
        admin_id: adminId,
        action: restrict ? 'ban_user' : 'restore',
        target_user_id: userId,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moderation-comments'] });
    },
  });
}

export function useModerationLog(filters: { page?: number; actionType?: string }) {
  return useQuery({
    queryKey: ['moderation-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('moderation_log')
        .select('*, admin:profiles!moderation_log_admin_id_fkey(full_name, avatar_url)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.actionType && filters.actionType !== 'all') {
        query = query.eq('action', filters.actionType);
      }

      const page = filters.page || 0;
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });
}

export function useQuestionsList() {
  return useQuery({
    queryKey: ['questions-list-for-moderation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
