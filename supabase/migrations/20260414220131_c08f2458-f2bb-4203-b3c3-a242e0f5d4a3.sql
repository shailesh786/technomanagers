
-- Comments on questions
CREATE TABLE public.question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.question_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.question_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own comments" ON public.question_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.question_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.question_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_question_comments_updated_at
  BEFORE UPDATE ON public.question_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Likes on questions
CREATE TABLE public.question_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

ALTER TABLE public.question_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view question likes" ON public.question_likes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own likes" ON public.question_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.question_likes FOR DELETE USING (auth.uid() = user_id);

-- Likes on comments
CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.question_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own comment likes" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment likes" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_question_comments_question_id ON public.question_comments(question_id);
CREATE INDEX idx_question_comments_parent_id ON public.question_comments(parent_id);
CREATE INDEX idx_question_likes_question_id ON public.question_likes(question_id);
CREATE INDEX idx_question_likes_user_id ON public.question_likes(user_id);
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
