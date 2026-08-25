import { describe, expect, it, vi } from 'vitest';
import {
  COMMENTS_PAGE_SIZE,
  COMMENT_SELECT,
  commentCountQueryKey,
  commentsQueryKey,
  fetchCommentCount,
  fetchCommentsPage,
  fetchQuestionReplies,
  groupRepliesByParent,
  nextCommentsPageParam,
  type Comment,
} from '@/lib/comments-query';

/**
 * A chainable stand-in for the PostgREST builder that records every call and
 * resolves to the given result. Lets the tests pin down the exact request the
 * server and the client both make, which is what hydration depends on.
 */
function fakeClient(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const calls: [string, unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'eq', 'is', 'not', 'order', 'range']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return { client: builder as never, calls };
}

describe('query keys', () => {
  it('are stable tuples the hook and the route share', () => {
    expect(commentsQueryKey('q1', 'newest')).toEqual(['comments', 'q1', 'newest']);
    expect(commentsQueryKey('q1', 'top')).toEqual(['comments', 'q1', 'top']);
    expect(commentCountQueryKey('q1')).toEqual(['comment_count', 'q1']);
  });
});

describe('fetchCommentsPage', () => {
  it('requests top-level, non-deleted comments for the question, newest first, one page at a time', async () => {
    const rows = [{ id: 'c1' }];
    const { client, calls } = fakeClient({ data: rows });
    const page = await fetchCommentsPage(client, 'q1', 'newest', 0);

    expect(page).toEqual({ data: rows, nextOffset: COMMENTS_PAGE_SIZE });
    expect(calls).toEqual([
      ['from', ['question_comments']],
      ['select', [COMMENT_SELECT]],
      ['eq', ['question_id', 'q1']],
      ['is', ['parent_id', null]],
      ['is', ['deleted_at', null]],
      ['order', ['created_at', { ascending: false }]],
      ['range', [0, COMMENTS_PAGE_SIZE - 1]],
    ]);
  });

  it('pages by offset and keeps the historical oldest-first meaning of "top"', async () => {
    const { client, calls } = fakeClient({ data: [] });
    const page = await fetchCommentsPage(client, 'q1', 'top', 20);
    expect(page.nextOffset).toBe(20 + COMMENTS_PAGE_SIZE);
    expect(calls).toContainEqual(['order', ['created_at', { ascending: true }]]);
    expect(calls).toContainEqual(['range', [20, 20 + COMMENTS_PAGE_SIZE - 1]]);
  });

  it('throws on a query error so callers can decide how to degrade', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: new Error('boom') });
    await expect(fetchCommentsPage(client, 'q1', 'newest', 0)).rejects.toThrow('boom');
    spy.mockRestore();
  });
});

describe('nextCommentsPageParam', () => {
  it('stops after a short page and continues after a full one', () => {
    expect(nextCommentsPageParam({ data: [], nextOffset: 10 })).toBeUndefined();
    expect(nextCommentsPageParam({ data: Array(COMMENTS_PAGE_SIZE).fill({}), nextOffset: 10 })).toBe(10);
  });
});

describe('fetchQuestionReplies', () => {
  it('requests every non-deleted reply on the question in one query, oldest first', async () => {
    const rows = [{ id: 'r1' }];
    const { client, calls } = fakeClient({ data: rows });
    await expect(fetchQuestionReplies(client, 'q1')).resolves.toEqual(rows);
    expect(calls).toEqual([
      ['from', ['question_comments']],
      ['select', [COMMENT_SELECT]],
      ['eq', ['question_id', 'q1']],
      ['not', ['parent_id', 'is', null]],
      ['is', ['deleted_at', null]],
      ['order', ['created_at', { ascending: true }]],
    ]);
  });

  it('throws on a query error so callers can decide how to degrade', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: new Error('boom') });
    await expect(fetchQuestionReplies(client, 'q1')).rejects.toThrow('boom');
    spy.mockRestore();
  });
});

describe('groupRepliesByParent', () => {
  const reply = (id: string, parent_id: string | null): Comment =>
    ({ id, parent_id, question_id: 'q1' } as Comment);

  it('groups replies under their parent, preserving row order', () => {
    const grouped = groupRepliesByParent([reply('r1', 'c1'), reply('r2', 'c2'), reply('r3', 'c1')]);
    expect(grouped).toEqual({
      c1: [reply('r1', 'c1'), reply('r3', 'c1')],
      c2: [reply('r2', 'c2')],
    });
  });

  it('returns an empty record for no rows', () => {
    expect(groupRepliesByParent([])).toEqual({});
  });

  it('skips orphan rows with no parent id', () => {
    expect(groupRepliesByParent([reply('r1', null)])).toEqual({});
  });
});

describe('fetchCommentCount', () => {
  it('counts non-deleted comments with a head request', async () => {
    const { client, calls } = fakeClient({ count: 5 });
    await expect(fetchCommentCount(client, 'q1')).resolves.toBe(5);
    expect(calls).toEqual([
      ['from', ['question_comments']],
      ['select', ['id', { count: 'exact', head: true }]],
      ['eq', ['question_id', 'q1']],
      ['is', ['deleted_at', null]],
    ]);
  });

  it('treats a null count as zero', async () => {
    const { client } = fakeClient({ count: null });
    await expect(fetchCommentCount(client, 'q1')).resolves.toBe(0);
  });
});
