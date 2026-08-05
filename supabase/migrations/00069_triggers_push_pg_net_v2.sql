
-- ══════════════════════════════════════════════════════════════════════════
-- notify_on_match : insère notif DB + push Expo via pg_net
-- pg_net lit SUPABASE_URL et SERVICE_ROLE_KEY depuis les secrets Vault
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_url text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
  v_key text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1);
BEGIN
  -- ── user1 ──────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = NEW.user1_id AND type = 'match' AND related_id = NEW.id
  ) THEN
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (NEW.user1_id, 'match', 'Nouveau Match Cosmique !',
      'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
      '💫', '#FFD700', NEW.id);

    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_url || '/functions/v1/send-push-on-event',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object(
          'event',   'match',
          'user_id', NEW.user1_id::text,
          'title',   'Nouveau Match Cosmique ! 💫',
          'body',    'Une connexion stellaire vient de s''établir !',
          'data',    jsonb_build_object('route', '/(app)/(tabs)/home')
        )
      );
    END IF;
  END IF;

  -- ── user2 ──────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = NEW.user2_id AND type = 'match' AND related_id = NEW.id
  ) THEN
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (NEW.user2_id, 'match', 'Nouveau Match Cosmique !',
      'Une connexion stellaire vient de s''établir. Allez écrire votre histoire !',
      '💫', '#FFD700', NEW.id);

    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_url || '/functions/v1/send-push-on-event',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object(
          'event',   'match',
          'user_id', NEW.user2_id::text,
          'title',   'Nouveau Match Cosmique ! 💫',
          'body',    'Une connexion stellaire vient de s''établir !',
          'data',    jsonb_build_object('route', '/(app)/(tabs)/home')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- notify_on_message : insère notif DB + push Expo via pg_net
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_partner_id    uuid;
  v_sender_prenom text;
  v_existing_id   uuid;
  v_notif_enabled boolean;
  v_url  text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL'      LIMIT 1);
  v_key  text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY'  LIMIT 1);
BEGIN
  SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
  INTO v_partner_id FROM matches WHERE id = NEW.match_id;

  IF v_partner_id IS NULL THEN RETURN NEW; END IF;
  IF v_partner_id = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT notif_enabled INTO v_notif_enabled FROM profiles WHERE id = v_partner_id;
  IF v_notif_enabled = false THEN RETURN NEW; END IF;

  SELECT prenom INTO v_sender_prenom FROM profiles WHERE id = NEW.sender_id;

  SELECT id INTO v_existing_id
  FROM notifications
  WHERE user_id = v_partner_id
    AND type = 'message'
    AND related_id = NEW.match_id
    AND is_read = false
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE notifications SET
      title      = COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit',
      body       = 'Vous avez de nouveaux messages dans la Plume d''Or',
      created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO notifications (user_id, type, title, body, emoji, couleur, related_id)
    VALUES (
      v_partner_id, 'message',
      COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit',
      'Vous avez un nouveau message dans la Plume d''Or',
      '💬', '#87CEEB', NEW.match_id
    );
  END IF;

  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/send-push-on-event',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object(
        'event',   'message',
        'user_id', v_partner_id::text,
        'title',   COALESCE(v_sender_prenom, 'Quelqu''un') || ' vous a écrit 💬',
        'body',    'Nouveau message dans la Plume d''Or',
        'data',    jsonb_build_object('route', '/(app)/(tabs)/home')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
