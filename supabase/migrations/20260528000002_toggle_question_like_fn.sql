-- Atomic toggle for question likes.
-- Inserts or deletes from question_likes AND updates questions.upvotes
-- in a single SECURITY DEFINER call so the caller doesn't need UPDATE
-- permission on the questions table.
CREATE OR REPLACE FUNCTION public.toggle_question_like(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_liked   boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM question_likes
    WHERE question_id = p_question_id AND user_id = v_user_id
  ) INTO v_liked;

  IF v_liked THEN
    -- Unlike
    DELETE FROM question_likes
    WHERE question_id = p_question_id AND user_id = v_user_id;

    UPDATE questions
    SET upvotes = GREATEST(0, COALESCE(upvotes, 0) - 1)
    WHERE id = p_question_id;

    RETURN jsonb_build_object('liked', false);
  ELSE
    -- Like
    INSERT INTO question_likes (question_id, user_id)
    VALUES (p_question_id, v_user_id);

    UPDATE questions
    SET upvotes = COALESCE(upvotes, 0) + 1
    WHERE id = p_question_id;

    RETURN jsonb_build_object('liked', true);
  END IF;
END;
$$;

-- Only authenticated users can like questions
GRANT EXECUTE ON FUNCTION public.toggle_question_like(uuid) TO authenticated;
