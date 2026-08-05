-- Table notifications réelles
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('match','message','destin','synchronicite','evenement','like')),
  title text NOT NULL,
  body text NOT NULL,
  emoji text DEFAULT '🔔',
  couleur text DEFAULT '#FFD700',
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifs visibles par l'utilisateur" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Notifs créées par système" ON notifications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notifs mises à jour par l'utilisateur" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Table likes sur contenu roman
CREATE TABLE IF NOT EXISTS roman_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('coeur','etoile','partage')),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, content_id, reaction)
);

ALTER TABLE roman_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes visibles par tous" ON roman_likes FOR SELECT USING (true);
CREATE POLICY "Likes créés par l'utilisateur" ON roman_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Likes supprimés par l'utilisateur" ON roman_likes FOR DELETE USING (user_id = auth.uid());

-- Colonne preferences dans profiles pour les paramètres
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_mystery boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS synchronicite_enabled boolean DEFAULT true;

-- Fonction pour créer une notification lors d'un match
CREATE OR REPLACE FUNCTION notify_on_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
  VALUES
    (NEW.user1_id, 'match', 'Nouveau Match Cosmique !',
     'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
     '💫', '#FFD700', NEW.id),
    (NEW.user2_id, 'match', 'Nouveau Match Cosmique !',
     'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
     '💫', '#FFD700', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_notify ON matches;
CREATE TRIGGER on_match_notify
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_on_match();

-- Fonction pour créer une notification lors d'un message
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_partner_id uuid;
  v_sender_prenom text;
BEGIN
  SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
  INTO v_partner_id FROM matches WHERE id = NEW.match_id;

  SELECT prenom INTO v_sender_prenom FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
  VALUES (v_partner_id, 'message',
    COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit',
    'Vous avez un nouveau message dans la Plume d''Or',
    '💬', '#87CEEB', NEW.match_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();