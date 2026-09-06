-- The course-thumbnails and event-thumbnails buckets were created by the
-- April 2026 migrations on the previous (Lovable-era) Supabase project and
-- were never applied to the current project, so admin course/event thumbnail
-- uploads fail with "Bucket not found". (hero-images exists — 20260814090000
-- was applied here directly.) Recreate both buckets, mirroring the applied
-- hero-images policy pattern. Idempotent: safe to re-run.

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-thumbnails', 'event-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- ── course-thumbnails policies ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Public read access for course-thumbnails" ON storage.objects;
CREATE POLICY "Public read access for course-thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Admin upload access for course-thumbnails" ON storage.objects;
CREATE POLICY "Admin upload access for course-thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin update access for course-thumbnails" ON storage.objects;
CREATE POLICY "Admin update access for course-thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'course-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin delete access for course-thumbnails" ON storage.objects;
CREATE POLICY "Admin delete access for course-thumbnails" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'course-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── event-thumbnails policies ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public read access for event-thumbnails" ON storage.objects;
CREATE POLICY "Public read access for event-thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-thumbnails');

DROP POLICY IF EXISTS "Admin upload access for event-thumbnails" ON storage.objects;
CREATE POLICY "Admin upload access for event-thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin update access for event-thumbnails" ON storage.objects;
CREATE POLICY "Admin update access for event-thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin delete access for event-thumbnails" ON storage.objects;
CREATE POLICY "Admin delete access for event-thumbnails" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-thumbnails' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
