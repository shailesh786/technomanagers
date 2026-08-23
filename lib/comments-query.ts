/**
 * lib/comments-query.ts
 *
 * Single source of truth for the community-answers query shape — shared by the
 * client hooks (hooks/useComments.ts) and the question detail server route,
 * which prefetches the first page so the answers land in the initial HTML.
 *
 * ⚠️ The server prefetch and the client hook MUST produce byte-identical data
 * for the same query key, or the HydrationBoundary cache is silently ignored
 * and the client refetches everything (see CLAUDE.md). Both sides call the
 * functions below, so the select string, filters, ordering and page size
 * cannot drift.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CommentSort = 'newest' | 'top';

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

export interface CommentsPage {
  data: Comment[];
  nextOffset: number;
}

export const COMMENTS_PAGE_SIZE = 10;
export const COMMENT_SELECT = '*, profile:user_id(id, full_name, avatar_url)';

export const commentsQueryKey = (questionId: string, sort: CommentSort) =>
  ['comments', questionId, sort] as const;

export const commentCountQueryKey = (questionId: string) => ['comment_count', questionId] as const;

// Both the cookieless public client and the browser client satisfy this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/** One page of top-level, non-deleted comments for a question. */
export async function fetchCommentsPage(
  client: AnyClient,
  questionId: string,
  sort: CommentSort,
  offset: number,
): Promise<CommentsPage> {
  const { data, error } = await client
    .from('question_comments')
    .select(COMMENT_SELECT)
    .eq('question_id', questionId)
    .is('parent_id', null)
    .is('deleted_at', null)
    // 'top' has always meant oldest-first here. Kept as-is: changing it would
    // change what the ['comments', id, 'top'] key means to every cached reader.
    .order('created_at', { ascending: sort !== 'newest' })
    .range(offset, offset + COMMENTS_PAGE_SIZE - 1);

  if (error) {
    console.error('Failed to fetch comments:', error);
    throw error;
  }
  return { data: (data ?? []) as unknown as Comment[], nextOffset: offset + COMMENTS_PAGE_SIZE };
}

/** Offset of the page after `lastPage`, or undefined once a short page signals the end. */
export function nextCommentsPageParam(lastPage: CommentsPage): number | undefined {
  return lastPage.data.length < COMMENTS_PAGE_SIZE ? undefined : lastPage.nextOffset;
}

/** Count of non-deleted comments (top-level and replies) on a question. */
export async function fetchCommentCount(client: AnyClient, questionId: string): Promise<number> {
  const { count, error } = await client
    .from('question_comments')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', questionId)
    .is('deleted_at', null);

  if (error) {
    console.error('Failed to fetch comment count:', error);
    throw error;
  }
  return count ?? 0;
}
