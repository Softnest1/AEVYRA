
-- 1. messages.sender_id : ajouter DEFAULT auth.uid() pour que le RLS passe
ALTER TABLE messages ALTER COLUMN sender_id SET DEFAULT auth.uid();

-- 2. profiles : ajouter colonne photo_principale si manquante (pour affichage)
-- (déjà présente comme photo_url)

-- 3. Activer Realtime sur messages et matches (si pas encore fait)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
