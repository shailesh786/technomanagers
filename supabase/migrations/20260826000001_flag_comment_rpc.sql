-- SECURITY: replace the over-broad "Auth users can flag comments" UPDATE policy
-- with an atomic flag_comment RPC.
--
-- The old policy (20260415055543) had no column restriction, and Postgres
-- OR-combines permissive policies — so any signed-in user could UPDATE any
-- column of anyone else's comment (rewrite content, set deleted_at) straight
-- through PostgREST with the anon key. It also split the report into two
-- client writes, and the second (moderation_log INSERT) always failed for
-- non-admins, leaving a flagged comment with no log entry.
--
-- flag_comment runs as SECURITY DEFINER: it validates the caller, flags the
-- comment, and writes the moderation_log row in one transaction. A reporter
-- row uses admin_id = reporter, action = 'flag', metadata.reporter_type =
-- 'user' — identical to what the client wrote before, so the admin
-- moderation UI (hooks/useModeration.ts) keeps working unchanged.

DROP POLICY IF EXISTS "Auth users can flag comments" ON public.question_comments;

CREATE OR REPLACE FUNCTION public.flag_comment(
  p_comment_id uuid, p_reason text, p_details text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner uuid; v_deleted timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id, deleted_at INTO v_owner, v_deleted FROM question_comments WHERE id = p_comment_id;
  IF NOT FOUND OR v_deleted IS NOT NULL THEN RAISE EXCEPTION 'Comment not found'; END IF;
  IF v_owner = v_user_id THEN RAISE EXCEPTION 'You cannot report your own comment'; END IF;
  UPDATE question_comments
  SET is_flagged = true,
      flagged_at = COALESCE(flagged_at, now()),
      flagged_by = COALESCE(flagged_by, v_user_id)   -- first reporter wins (matches "Already reported" UI)
  WHERE id = p_comment_id;
  INSERT INTO moderation_log (admin_id, comment_id, action, reason, metadata)
  VALUES (v_user_id, p_comment_id, 'flag', p_reason,
          jsonb_build_object('details', p_details, 'reporter_type', 'user'));
END; $$;

REVOKE ALL ON FUNCTION public.flag_comment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_comment(uuid, text, text) TO authenticated;
