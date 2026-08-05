
-- ══════════════════════════════════════════════════════════════
-- v451 — Fix RLS : supprimer les policies INSERT/SELECT dupliquées
-- sur messages qui permettaient de contourner le blocage
-- ══════════════════════════════════════════════════════════════

-- L'ancienne policy "Envoyer un message" (sans vérif blocage)
-- coexistait avec "messages_insert" (avec vérif blocage).
-- Postgres applique OR entre policies → la vieille policy sans vérif
-- permettait d'insérer même si bloqué. On la supprime.
DROP POLICY IF EXISTS "Envoyer un message"        ON public.messages;
DROP POLICY IF EXISTS "Voir les messages de ses matches" ON public.messages;

-- Idem pour DELETE dupliqué
DROP POLICY IF EXISTS "Supprimer son message"     ON public.messages;
DROP POLICY IF EXISTS "messages_delete"           ON public.messages;

-- Recréer DELETE propre
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Vérifier que messages_select et messages_insert sont bien présents
-- (créés en v450 — idempotent si déjà là)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'messages_select'
  ) THEN
    CREATE POLICY "messages_select" ON public.messages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.matches m
          WHERE m.id = match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
            AND NOT public.is_blocked_by_either(
              CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
            )
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'messages_insert'
  ) THEN
    CREATE POLICY "messages_insert" ON public.messages
      FOR INSERT
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.matches m
          WHERE m.id = match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
            AND NOT public.is_blocked_by_either(
              CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END
            )
        )
      );
  END IF;
END $$;
