-- 1. Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow Public to View Images
CREATE POLICY "Public can view event images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'event-images' );

-- 3. Policy: Allow Authenticated Users (Admins) to Upload
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'event-images' );

-- 4. Policy: Allow Admin to Update/Delete (Optional but good)
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'event-images' );

CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'event-images' );
