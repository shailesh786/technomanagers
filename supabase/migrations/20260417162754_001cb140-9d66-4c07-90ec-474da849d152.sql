INSERT INTO storage.buckets (id, name, public) VALUES ('event-thumbnails', 'event-thumbnails', true);

CREATE POLICY "Public read access for event-thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'event-thumbnails');

CREATE POLICY "Admin upload access for event-thumbnails" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'event-thumbnails' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin update access for event-thumbnails" ON storage.objects FOR UPDATE USING (
  bucket_id = 'event-thumbnails' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin delete access for event-thumbnails" ON storage.objects FOR DELETE USING (
  bucket_id = 'event-thumbnails' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);