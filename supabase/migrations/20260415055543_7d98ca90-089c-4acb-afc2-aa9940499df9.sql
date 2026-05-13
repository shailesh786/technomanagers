
-- Add moderation fields to question_comments
ALTER TABLE question_comments ADD COLUMN is_flagged BOOLEAN DEFAULT false;
ALTER TABLE question_comments ADD COLUMN flagged_at TIMESTAMPTZ;
ALTER TABLE question_comments ADD COLUMN flagged_by UUID REFERENCES profiles(id);
ALTER TABLE question_comments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE question_comments ADD COLUMN deleted_by UUID REFERENCES profiles(id);
ALTER TABLE question_comments ADD COLUMN deletion_reason TEXT;

-- Add commenting restriction to profiles
ALTER TABLE profiles ADD COLUMN commenting_disabled BOOLEAN DEFAULT false;

-- Create moderation log table
CREATE TABLE public.moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  comment_id UUID REFERENCES question_comments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view moderation log"
ON public.moderation_log FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert moderation log"
ON public.moderation_log FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Update question_comments SELECT policy: public sees non-deleted, admins see all
DROP POLICY IF EXISTS "Anyone can view comments" ON question_comments;

CREATE POLICY "Public can view active comments"
ON question_comments FOR SELECT
USING (deleted_at IS NULL OR public.is_admin(auth.uid()));

-- Allow authenticated users to flag comments (update is_flagged fields)
CREATE POLICY "Auth users can flag comments"
ON question_comments FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() != user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() != user_id
);

-- Allow admins to update any comment (for moderation actions)
DROP POLICY IF EXISTS "Users can update own comments" ON question_comments;

CREATE POLICY "Users can update own comments"
ON question_comments FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
