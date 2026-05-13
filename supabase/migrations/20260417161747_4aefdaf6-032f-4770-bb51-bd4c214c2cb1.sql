CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('webinar', 'workshop', 'live_qa', 'meetup', 'other')),
  event_date TIMESTAMPTZ NOT NULL,
  duration TEXT,
  thumbnail_url TEXT,
  external_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upcoming or live events"
ON public.events FOR SELECT
USING (status IN ('upcoming', 'live') OR is_admin(auth.uid()));

CREATE POLICY "Admins can insert events"
ON public.events FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (is_admin(auth.uid()));

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();