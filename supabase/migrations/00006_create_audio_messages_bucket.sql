
-- Bucket pour les messages vocaux
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  10485760,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/x-m4a']
);

-- RLS Storage : upload pour utilisateurs authentifiés
CREATE POLICY "auth users can upload voice messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

-- Lecture publique
CREATE POLICY "public can read voice messages"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-messages');

-- Suppression par l'auteur
CREATE POLICY "owner can delete voice message"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-messages' AND owner::uuid = auth.uid());
