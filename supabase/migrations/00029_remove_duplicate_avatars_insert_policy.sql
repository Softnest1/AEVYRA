-- Supprimer le doublon de policy INSERT créé par la migration précédente
DROP POLICY IF EXISTS "Uploader son avatar" ON storage.objects;
