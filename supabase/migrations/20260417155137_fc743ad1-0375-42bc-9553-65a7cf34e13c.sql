-- Create roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view active roles (admins see all)
CREATE POLICY "Anyone can view active roles"
  ON public.roles FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert roles"
  ON public.roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.roles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial roles
INSERT INTO public.roles (name, display_order) VALUES
  ('Product Management', 1),
  ('Program Management', 2),
  ('Management Consulting', 3),
  ('Category Management', 4),
  ('Business', 5);