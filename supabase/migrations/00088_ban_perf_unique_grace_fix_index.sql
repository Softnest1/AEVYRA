
-- 1. Empêcher les doublons grace_requests par sanction
--    Un utilisateur ne peut envoyer qu'UNE demande par sanction
ALTER TABLE public.grace_requests
  ADD CONSTRAINT uq_grace_per_sanction UNIQUE (user_id, sanction_id);

-- 2. Supprimer l'index doublon (idx_sanctions_expires couvre la même chose que idx_sanctions_expires_at)
DROP INDEX IF EXISTS public.idx_sanctions_expires;

-- 3. Index composite sur grace_requests(user_id, sanction_id) pour les lookups O(log n)
--    (Le UNIQUE crée déjà l'index — pas besoin d'en créer un autre)

-- 4. Index partiel sur sanctions pour le check ban (user_id + ban actif) — couvre le _layout query
--    Déjà couvert par idx_sanctions_user_active, vérifier qu'il couvre bien type aussi
-- Renforcer avec un index couvrant (user_id, type, status, expires_at) pour éviter heap fetch
CREATE INDEX IF NOT EXISTS idx_sanctions_ban_check
  ON public.sanctions (user_id, expires_at)
  WHERE status IN ('active', 'permanent')
    AND type IN ('ban_temp', 'ban_permanent');
