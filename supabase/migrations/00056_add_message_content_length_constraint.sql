
-- ══════════════════════════════════════════════════════════
-- Migration 056 — Contrainte longueur messages
-- ══════════════════════════════════════════════════════════

-- 1. Contrainte CHECK : contenu entre 1 et 2000 caractères
--    (les messages vocaux sont des URLs [vocal:https://...] — toujours < 300 chars)
--    (les capsules texte idem, format libre mais borné)
ALTER TABLE messages
  ADD CONSTRAINT messages_content_length
  CHECK (
    char_length(content) >= 1
    AND char_length(content) <= 2000
  );

-- 2. Index partiel sur les messages longs (audit admin)
CREATE INDEX IF NOT EXISTS idx_messages_long
  ON messages (id, char_length(content))
  WHERE char_length(content) > 1000;
