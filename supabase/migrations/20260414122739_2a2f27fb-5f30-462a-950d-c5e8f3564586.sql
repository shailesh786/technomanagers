
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true);

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Admin upload access" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'course-thumbnails' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin delete access" ON storage.objects FOR DELETE USING (
  bucket_id = 'course-thumbnails' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
