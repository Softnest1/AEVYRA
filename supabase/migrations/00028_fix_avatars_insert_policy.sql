-- Ajouter la policy INSERT manquante pour l'upload des avatars
CREATE POLICY "Uploader son avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Vérifier le file_size_limit (10 MB max recommandé pour photos profil)
UPDATE storage.buckets
  SET file_size_limit = 10485760,  -- 10 MB
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  WHERE id = 'avatars';
