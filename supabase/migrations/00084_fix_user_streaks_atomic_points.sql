
-- ── 1. Dédupliquer user_streaks (au cas où) ───────────────────────────────
-- Garder la ligne avec total_points le plus élevé par user_id
DELETE FROM user_streaks a
USING user_streaks b
WHERE a.user_id = b.user_id AND a.total_points < b.total_points;

-- ── 2. Contrainte UNIQUE sur user_id ─────────────────────────────────────
ALTER TABLE user_streaks ADD CONSTRAINT user_streaks_user_id_key UNIQUE (user_id);

-- ── 3. RLS streak_update : ajouter WITH CHECK ─────────────────────────────
DROP POLICY IF EXISTS streak_update ON user_streaks;
CREATE POLICY streak_update ON user_streaks
  FOR UPDATE
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. RPC atomique update_streak : UPSERT + incrément dans une seule txn ─
-- Remplace la logique lecture→écriture côté client par une opération
-- atomic : aucun doublon possible, aucun point perdu en concurrence.
CREATE OR REPLACE FUNCTION update_streak(
  p_user_id uuid,
  p_today   date,
  p_pts     int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak   record;
  v_yday     date := p_today - interval '1 day';
  v_new_cur  int;
  v_new_long int;
  v_new_pts  int;
BEGIN
  -- Lire + verrouiller en une seule opération
  SELECT * INTO v_streak
  FROM user_streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Première fois : insérer
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active, total_points)
    VALUES (p_user_id, 1, 1, p_today, p_pts)
    ON CONFLICT (user_id) DO UPDATE SET  -- guard race condition
      total_points   = user_streaks.total_points + p_pts,
      current_streak = CASE
        WHEN user_streaks.last_active = p_today THEN user_streaks.current_streak
        WHEN user_streaks.last_active = (p_today - interval '1 day') THEN user_streaks.current_streak + 1
        ELSE 1 END,
      longest_streak = GREATEST(user_streaks.longest_streak,
        CASE
          WHEN user_streaks.last_active = p_today THEN user_streaks.current_streak
          WHEN user_streaks.last_active = (p_today - interval '1 day') THEN user_streaks.current_streak + 1
          ELSE 1 END),
      last_active  = p_today,
      updated_at   = now();
    RETURN jsonb_build_object('ok', true, 'action', 'inserted');
  END IF;

  -- Calcul streak
  v_new_cur := CASE
    WHEN v_streak.last_active = p_today  THEN v_streak.current_streak          -- déjà actif aujourd'hui
    WHEN v_streak.last_active = v_yday   THEN v_streak.current_streak + 1       -- continuité
    ELSE 1                                                                       -- rupture
  END;
  v_new_long := GREATEST(v_streak.longest_streak, v_new_cur);
  -- Points : toujours cumulés même si même jour (plusieurs challenges complétés)
  v_new_pts  := coalesce(v_streak.total_points, 0) + p_pts;

  UPDATE user_streaks SET
    current_streak = v_new_cur,
    longest_streak = v_new_long,
    last_active    = p_today,
    total_points   = v_new_pts,
    updated_at     = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'current_streak', v_new_cur,
    'longest_streak', v_new_long,
    'total_points',   v_new_pts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_streak(uuid, date, int) TO authenticated;
