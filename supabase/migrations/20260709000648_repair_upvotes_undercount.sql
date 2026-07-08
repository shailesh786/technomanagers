-- Repair: questions.upvotes undercounted vs question_likes rows.
--
-- Background:
--   The question DETAIL page used to toggle likes with a raw insert/delete
--   on question_likes, bypassing the questions.upvotes counter that the
--   list/homepage cards display. Every like made from the detail page
--   therefore created a row without incrementing the counter, so the two
--   like counts drifted apart (e.g. counter=1 while 3 rows existed).
--   The app code now routes all like toggles through the
--   toggle_question_like RPC, which updates both atomically.
--
-- This migration repairs the historical drift ONE WAY only:
--   counter < row-count  →  raise counter to row-count (recovers the likes
--                           the detail page failed to count)
--   counter > row-count  →  LEFT UNTOUCHED. Several questions carry large
--                           seeded/legacy upvote values (e.g. 96) with few
--                           or no like rows; lowering them would visibly
--                           wipe social-proof numbers across the site.
--
-- Safe to re-run (idempotent): the WHERE clause matches nothing once
-- counters are >= their row-counts.

UPDATE public.questions q
SET upvotes = sub.like_rows
FROM (
  SELECT question_id, COUNT(*)::int AS like_rows
  FROM public.question_likes
  GROUP BY question_id
) sub
WHERE q.id = sub.question_id
  AND COALESCE(q.upvotes, 0) < sub.like_rows;
