-- ══════════════════════════════════════════════════════
-- AEVYRA — Anti-spam notifications + déduplication
-- ══════════════════════════════════════════════════════

-- 1. Index pour requêtes de dédup rapides
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_related
  ON notifications (user_id, type, related_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- 2. Limite : max 100 notifications par utilisateur (auto-purge des plus anciennes)
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM notifications
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM notifications
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_notifications ON notifications;
CREATE TRIGGER trg_purge_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.purge_old_notifications();

-- 3. notify_on_message — anti-spam : 1 notif non-lue max par match (regroupement)
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_partner_id uuid;
  v_sender_prenom text;
  v_existing_id uuid;
  v_notif_enabled boolean;
BEGIN
  -- Trouver le partenaire
  SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
  INTO v_partner_id FROM matches WHERE id = NEW.match_id;

  IF v_partner_id IS NULL THEN RETURN NEW; END IF;

  -- Vérifier que les notifs sont activées
  SELECT notif_enabled INTO v_notif_enabled FROM profiles WHERE id = v_partner_id;
  IF v_notif_enabled = false THEN RETURN NEW; END IF;

  -- Ne pas notifier si le partenaire est l'expéditeur
  IF v_partner_id = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT prenom INTO v_sender_prenom FROM profiles WHERE id = NEW.sender_id;

  -- Chercher une notif message non-lue existante pour ce match
  SELECT id INTO v_existing_id
  FROM notifications
  WHERE user_id = v_partner_id
    AND type = 'message'
    AND related_id = NEW.match_id
    AND is_read = false
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Mettre à jour la notif existante (évite le spam)
    UPDATE notifications SET
      title  = COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit',
      body   = 'Vous avez de nouveaux messages dans la Plume d''Or',
      created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    -- Créer une nouvelle notif seulement si aucune non-lue n'existe
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (
      v_partner_id, 'message',
      COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit',
      'Vous avez un nouveau message dans la Plume d''Or',
      '💬', '#87CEEB', NEW.match_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- 4. notify_on_connection_request — anti-spam : 1 notif max par paire from/to
CREATE OR REPLACE FUNCTION public.notify_on_connection_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prenom text;
  v_already int;
BEGIN
  -- Vérifier si une notif like non-lue existe déjà pour cette connexion
  SELECT COUNT(*) INTO v_already
  FROM notifications
  WHERE user_id = NEW.to_user_id
    AND type = 'like'
    AND related_id = NEW.id
    AND is_read = false;

  IF v_already > 0 THEN RETURN NEW; END IF;

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
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_connection_request();

-- 5. notify_on_match — anti-spam : vérifier si notif match déjà envoyée
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- user1
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = NEW.user1_id AND type = 'match' AND related_id = NEW.id
  ) THEN
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (NEW.user1_id, 'match', 'Nouveau Match Cosmique !',
      'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
      '💫', '#FFD700', NEW.id);
  END IF;
  -- user2
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = NEW.user2_id AND type = 'match' AND related_id = NEW.id
  ) THEN
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (NEW.user2_id, 'match', 'Nouveau Match Cosmique !',
      'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
      '💫', '#FFD700', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_notify ON matches;
CREATE TRIGGER on_match_notify
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();
