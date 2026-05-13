
-- Allow public read of profiles (needed for comment author display)
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT
USING (true);

-- Fix comment SELECT policy to properly handle deleted_at
DROP POLICY IF EXISTS "Public can view active comments" ON question_comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON question_comments;

CREATE POLICY "Anyone can read active comments"
ON question_comments FOR SELECT
USING (deleted_at IS NULL OR public.is_admin(auth.uid()));
