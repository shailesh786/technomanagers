/**
 * lib/question-list-select.ts
 *
 * Single source of truth for the question LIST query shape — shared by the
 * client hook (hooks/useQuestions.ts) and the server prefetch fetchers
 * (app/page.tsx, app/questions/page.tsx).
 *
 * ⚠️ The server prefetch and the client hook MUST produce byte-identical
 * data for the same query key, or the HydrationBoundary cache is silently
 * ignored and the client refetches everything (see CLAUDE.md). Keeping the
 * select string and the row mapping here guarantees they can't drift.
 *
 * The `question_comments(count)` embed returns the number of comments per
 * question in the same round-trip. Callers MUST also apply
 * `.is('question_comments.deleted_at', null)` so the count excludes deleted
 * comments — matching useCommentCount() on the detail page.
 */

export const QUESTION_LIST_SELECT =
  'id, question_text, company, category, tags, difficulty, role, status, upvotes, created_at, question_comments(count)';

type RawQuestionRow = {
  question_comments?: { count: number }[] | null;
  [key: string]: unknown;
};

/** Flatten the PostgREST embed `question_comments: [{count: N}]` → `comment_count: N`. */
export function flattenCommentCount<T extends RawQuestionRow>(rows: T[]) {
  return rows.map(({ question_comments, ...rest }) => ({
    ...rest,
    comment_count: question_comments?.[0]?.count ?? 0,
  }));
}
