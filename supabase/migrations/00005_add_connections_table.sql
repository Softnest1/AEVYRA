-- Table des connexions / demandes d'amitié romantique
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Voir ses propres connexions (envoyées et reçues)
CREATE POLICY "Voir ses connexions" ON connections
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Envoyer une demande
CREATE POLICY "Envoyer une demande" ON connections
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Mettre à jour (accepter/refuser) — uniquement le destinataire
CREATE POLICY "Répondre à une demande" ON connections
  FOR UPDATE USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Notifier lors d'une nouvelle demande
CREATE OR REPLACE FUNCTION notify_on_connection_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prenom text;
BEGIN
  SELECT prenom INTO v_prenom FROM profiles WHERE id = NEW.from_user_id;
  INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
  VALUES (
    NEW.to_user_id, 'like',
    COALESCE(v_prenom,'Une âme') || ' souhaite vous rejoindre',
    'Vous avez reçu une demande de connexion romantique.',
    '💌', '#FFB6C1', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_request ON connections;
CREATE TRIGGER on_connection_request
  AFTER INSERT ON connections
  FOR EACH ROW EXECUTE FUNCTION notify_on_connection_request();

-- Notifier lors d'une acceptation
CREATE OR REPLACE FUNCTION notify_on_connection_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prenom text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT prenom INTO v_prenom FROM profiles WHERE id = NEW.to_user_id;
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (
      NEW.from_user_id, 'match',
      COALESCE(v_prenom,'Une âme') || ' a accepté votre connexion !',
      'Votre lien cosmique est établi. Commencez à écrire votre histoire.',
      '💫', '#FFD700', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_accepted ON connections;
CREATE TRIGGER on_connection_accepted
  AFTER UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION notify_on_connection_accepted();