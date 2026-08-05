-- ═══════════════════════════════════════════════════════════════
-- MESSAGERIE STRATÉGIQUE — Quota progressif + premier message guidé
-- J1 (0-24h) : 10 messages max  | J2 (24-48h) : 20 messages max
-- J3+ : illimité — la relation est établie
-- Icebreaker obligatoire pour le tout premier message (≥ 15 chars)
-- ═══════════════════════════════════════════════════════════════

-- 1. Fonction : retourne combien de messages un user a envoyé aujourd'hui dans un match
CREATE OR REPLACE FUNCTION public.count_messages_today(p_match_id UUID, p_sender_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM messages
  WHERE match_id = p_match_id
    AND sender_id = p_sender_id
    AND created_at >= CURRENT_DATE AT TIME ZONE 'Europe/Paris'
    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Europe/Paris';
$$;

-- 2. Fonction : retourne l'âge du match en jours (depuis quand ces 2 âmes se parlent)
CREATE OR REPLACE FUNCTION public.match_age_days(p_match_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXTRACT(DAY FROM (NOW() - created_at))::INTEGER
  FROM matches
  WHERE id = p_match_id;
$$;

-- 3. Fonction principale : peut-on envoyer un message ? (quota + icebreaker)
--    Retourne : 'ok' | 'quota_j1' | 'quota_j2' | 'icebreaker_required' | 'not_in_match'
CREATE OR REPLACE FUNCTION public.can_send_message(p_match_id UUID, p_content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_age_days     INTEGER;
  v_today_count  INTEGER;
  v_total_count  INTEGER;
  v_in_match     BOOLEAN;
BEGIN
  -- Vérifier appartenance au match
  SELECT EXISTS(
    SELECT 1 FROM matches
    WHERE id = p_match_id
      AND (user1_id = v_user_id OR user2_id = v_user_id)
  ) INTO v_in_match;

  IF NOT v_in_match THEN
    RETURN 'not_in_match';
  END IF;

  -- Âge du match (jours depuis le match)
  SELECT match_age_days(p_match_id) INTO v_age_days;

  -- Nombre de messages envoyés par ce user aujourd'hui dans ce match
  SELECT count_messages_today(p_match_id, v_user_id) INTO v_today_count;

  -- Quota J1 (< 1 jour) : max 10 messages/jour
  IF v_age_days < 1 AND v_today_count >= 10 THEN
    RETURN 'quota_j1';
  END IF;

  -- Quota J2 (1-2 jours) : max 20 messages/jour
  IF v_age_days = 1 AND v_today_count >= 20 THEN
    RETURN 'quota_j2';
  END IF;

  -- Icebreaker : total messages envoyés par ce user dans ce match
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM messages
  WHERE match_id = p_match_id AND sender_id = v_user_id;

  -- Premier message : doit faire ≥ 15 caractères (pas juste "salut" ou "😊")
  IF v_total_count = 0 AND LENGTH(TRIM(p_content)) < 15 THEN
    RETURN 'icebreaker_required';
  END IF;

  RETURN 'ok';
END;
$$;

-- 4. Vue utilitaire : quota restant pour l'utilisateur connecté dans un match
--    Usage frontend : SELECT * FROM my_message_quota WHERE match_id = '...'
CREATE OR REPLACE VIEW public.my_message_quota AS
SELECT
  m.id AS match_id,
  EXTRACT(DAY FROM (NOW() - m.created_at))::INTEGER AS match_age_days,
  count_messages_today(m.id, auth.uid()) AS sent_today,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - m.created_at))::INTEGER < 1  THEN 10
    WHEN EXTRACT(DAY FROM (NOW() - m.created_at))::INTEGER = 1  THEN 20
    ELSE NULL  -- illimité
  END AS daily_limit,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - m.created_at))::INTEGER < 1
      THEN GREATEST(0, 10 - count_messages_today(m.id, auth.uid()))
    WHEN EXTRACT(DAY FROM (NOW() - m.created_at))::INTEGER = 1
      THEN GREATEST(0, 20 - count_messages_today(m.id, auth.uid()))
    ELSE NULL  -- illimité
  END AS remaining
FROM matches m
WHERE m.user1_id = auth.uid() OR m.user2_id = auth.uid();

-- RLS sur la vue
GRANT SELECT ON public.my_message_quota TO authenticated;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.can_send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_messages_today(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_age_days(UUID) TO authenticated;
