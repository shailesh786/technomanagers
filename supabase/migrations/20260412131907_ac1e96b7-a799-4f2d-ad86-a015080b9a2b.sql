
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (must be created before is_admin function)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin check function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  company TEXT[],
  category TEXT[],
  tags TEXT[],
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  sample_answer TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published questions" ON public.questions FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert questions" ON public.questions FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update questions" ON public.questions FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  thumbnail_url TEXT,
  external_url TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coaching Services table
CREATE TABLE public.coaching_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  service_type TEXT CHECK (service_type IN ('resume_review', 'mock_interview', 'mentorship', 'masterclass', 'other')),
  short_description TEXT,
  price INTEGER,
  original_price INTEGER,
  duration TEXT,
  platform TEXT DEFAULT 'Video meeting',
  rating NUMERIC(2,1),
  external_url TEXT NOT NULL,
  badge_text TEXT,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.coaching_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaching" ON public.coaching_services FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert coaching" ON public.coaching_services FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update coaching" ON public.coaching_services FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete coaching" ON public.coaching_services FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_coaching_updated_at BEFORE UPDATE ON public.coaching_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved Questions table
CREATE TABLE public.saved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved" ON public.saved_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save questions" ON public.saved_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave questions" ON public.saved_questions FOR DELETE USING (auth.uid() = user_id);
