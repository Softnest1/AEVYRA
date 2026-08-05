
-- ============================================================
-- HARDENING : Grants, RLS policies et cohérence des bans
-- ============================================================

-- ── 1. RÉVOQUER les grants dangereux sur les tables de sécurité ──────────────
-- Ces tables ne doivent JAMAIS être modifiées directement par anon/authenticated.
-- Toutes les écritures passent par des fonctions SECURITY DEFINER.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.banned_ips         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.security_events    FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.honeypot_triggers  FROM anon, authenticated;

-- Garder SELECT sur aucune de ces tables pour anon (déjà bloqué par RLS, mais clarté)
REVOKE SELECT ON public.banned_ips         FROM anon;
REVOKE SELECT ON public.security_events    FROM anon;
REVOKE SELECT ON public.honeypot_triggers  FROM anon;
REVOKE SELECT ON public.banned_ips         FROM authenticated;
REVOKE SELECT ON public.security_events    FROM authenticated;
REVOKE SELECT ON public.honeypot_triggers  FROM authenticated;

-- Seulement les admins peuvent lire via RLS (policies existantes) — pas besoin de grant direct

-- ── 2. RÉVOQUER sur sanctions : anon ne doit rien pouvoir faire ──────────────
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.sanctions FROM anon;
-- authenticated garde SELECT (policy user_read_own_sanction) mais pas DELETE/UPDATE direct
REVOKE DELETE, TRUNCATE ON public.sanctions FROM authenticated;
-- UPDATE direct retiré — uniquement via SECURITY DEFINER
REVOKE UPDATE ON public.sanctions FROM authenticated;
-- INSERT direct retiré — uniquement via apply_sanction()
REVOKE INSERT ON public.sanctions FROM authenticated;

-- ── 3. FORCER Row Level Security (FORCE ROW LEVEL SECURITY) ─────────────────
-- Empêche même le table owner de contourner RLS (sauf service_role qui est superuser)
ALTER TABLE public.banned_ips        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_events   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.honeypot_triggers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions         FORCE ROW LEVEL SECURITY;

-- ── 4. POLICIES RLS manquantes — UPDATE et DELETE explicitement interdits ────

-- banned_ips : personne ne peut UPDATE ou DELETE directement (uniquement service_role)
DROP POLICY IF EXISTS "no_direct_update_banned"  ON public.banned_ips;
DROP POLICY IF EXISTS "no_direct_delete_banned"  ON public.banned_ips;
CREATE POLICY "no_direct_update_banned"  ON public.banned_ips FOR UPDATE USING (false);
CREATE POLICY "no_direct_delete_banned"  ON public.banned_ips FOR DELETE USING (false);

-- security_events : lecture seule admin, aucune écriture directe
DROP POLICY IF EXISTS "no_direct_update_security" ON public.security_events;
DROP POLICY IF EXISTS "no_direct_delete_security" ON public.security_events;
CREATE POLICY "no_direct_update_security" ON public.security_events FOR UPDATE USING (false);
CREATE POLICY "no_direct_delete_security" ON public.security_events FOR DELETE USING (false);

-- honeypot_triggers : idem
DROP POLICY IF EXISTS "no_direct_update_honeypot" ON public.honeypot_triggers;
DROP POLICY IF EXISTS "no_direct_delete_honeypot" ON public.honeypot_triggers;
CREATE POLICY "no_direct_update_honeypot" ON public.honeypot_triggers FOR UPDATE USING (false);
CREATE POLICY "no_direct_delete_honeypot" ON public.honeypot_triggers FOR DELETE USING (false);

-- sanctions : un utilisateur ne peut ni modifier ni supprimer ses propres sanctions
DROP POLICY IF EXISTS "no_user_update_sanction" ON public.sanctions;
DROP POLICY IF EXISTS "no_user_delete_sanction" ON public.sanctions;
CREATE POLICY "no_user_update_sanction" ON public.sanctions FOR UPDATE USING (is_admin());
CREATE POLICY "no_user_delete_sanction" ON public.sanctions FOR DELETE USING (is_admin());
-- INSERT uniquement via SECURITY DEFINER apply_sanction()
DROP POLICY IF EXISTS "no_direct_insert_sanction" ON public.sanctions;
CREATE POLICY "no_direct_insert_sanction" ON public.sanctions FOR INSERT WITH CHECK (is_admin());

-- ── 5. COHÉRENCE BAN : s'assurer que le profil reste cohérent avec sanctions ─
-- Trigger qui maintient is_banned en sync si une sanction est supprimée/modifiée
-- (double sécurité car seuls les admins/SECURITY DEFINER peuvent modifier)
CREATE OR REPLACE FUNCTION public.sync_profile_ban_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Après UPDATE ou DELETE sur sanctions, resynchroniser le profil
  UPDATE public.profiles
  SET is_banned = EXISTS (
    SELECT 1 FROM public.sanctions s
    WHERE s.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND s.status IN ('active', 'permanent')
      AND s.type IN ('ban_temp', 'ban_permanent')
  ),
  banned_reason = (
    SELECT s.reason FROM public.sanctions s
    WHERE s.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND s.status IN ('active', 'permanent')
      AND s.type IN ('ban_temp', 'ban_permanent')
    ORDER BY s.created_at DESC LIMIT 1
  ),
  banned_at = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.sanctions s
      WHERE s.user_id = COALESCE(NEW.user_id, OLD.user_id)
        AND s.status IN ('active', 'permanent')
        AND s.type IN ('ban_temp', 'ban_permanent')
    ) THEN COALESCE(profiles.banned_at, now())
    ELSE NULL
  END
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attacher le trigger sur sanctions (après INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_sync_profile_ban ON public.sanctions;
CREATE TRIGGER trg_sync_profile_ban
  AFTER INSERT OR UPDATE OF status, type OR DELETE
  ON public.sanctions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_ban_status();

-- ── 6. PERSISTANCE des bans admin : s'assurer qu'un ban_permanent n'expire jamais ─
-- Ajouter une contrainte CHECK : ban_permanent ne peut pas avoir expires_at non-null
ALTER TABLE public.sanctions
  DROP CONSTRAINT IF EXISTS chk_ban_permanent_no_expiry;
ALTER TABLE public.sanctions
  ADD CONSTRAINT chk_ban_permanent_no_expiry
  CHECK (type != 'ban_permanent' OR expires_at IS NULL);

-- ── 7. RESYNC immédiate — corriger toute incohérence existante ───────────────
-- profiles.is_banned doit refléter exactement l'état des sanctions actives
UPDATE public.profiles p
SET
  is_banned = EXISTS (
    SELECT 1 FROM public.sanctions s
    WHERE s.user_id = p.id
      AND s.status IN ('active', 'permanent')
      AND s.type IN ('ban_temp', 'ban_permanent')
  ),
  banned_reason = (
    SELECT s.reason FROM public.sanctions s
    WHERE s.user_id = p.id
      AND s.status IN ('active', 'permanent')
      AND s.type IN ('ban_temp', 'ban_permanent')
    ORDER BY s.created_at DESC LIMIT 1
  ),
  banned_at = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.sanctions s
      WHERE s.user_id = p.id
        AND s.status IN ('active', 'permanent')
        AND s.type IN ('ban_temp', 'ban_permanent')
    ) THEN COALESCE(p.banned_at, now())
    ELSE NULL
  END;
