-- ══════════════════════════════════════════════════════════════════
-- SYSTÈME DE CHALLENGES ÂMOUR — Gamification complète
-- ══════════════════════════════════════════════════════════════════

-- 1. Catalogue des challenges (géré par admin / seed)
CREATE TABLE IF NOT EXISTS challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,           -- identifiant stable pour le seed
  titre         TEXT NOT NULL,
  description   TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '✦',
  type          TEXT NOT NULL CHECK (type IN (
                  'daily',      -- défi quotidien (expire à minuit)
                  'weekly',     -- défi hebdomadaire
                  'social',     -- implique une action vers un autre user
                  'creative',   -- écriture / expression
                  'reflexion',  -- introspection
                  'surprise'    -- défi mystère débloqué aléatoirement
                )),
  difficulte    TEXT NOT NULL DEFAULT 'facile' CHECK (difficulte IN ('facile','moyen','difficile','legendaire')),
  points        INT NOT NULL DEFAULT 10,
  badge_reward  TEXT,                           -- emoji badge débloqué si récompense
  action_type   TEXT NOT NULL CHECK (action_type IN (
                  'send_message',   -- envoyer un message à quelqu'un de nouveau
                  'send_like',      -- envoyer un like créatif
                  'write_roman',    -- publier dans le Roman
                  'view_profiles',  -- consulter N profils
                  'update_bio',     -- mettre à jour sa bio / devise
                  'complete_profile', -- compléter une section du profil
                  'share_song',     -- partager sa chanson de vie
                  'answer_quiz',    -- répondre à une question surprise
                  'visit_map',      -- ouvrir la carte et explorer
                  'manual'          -- validation manuelle / auto-complete
                )),
  action_count  INT NOT NULL DEFAULT 1,         -- combien de fois il faut faire l'action
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  order_index   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Progression des challenges par utilisateur
CREATE TABLE IF NOT EXISTS user_challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id   UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress       INT NOT NULL DEFAULT 0,        -- avancement (ex: 2/3 profils vus)
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  points_earned  INT NOT NULL DEFAULT 0,
  date_assigned  DATE NOT NULL DEFAULT CURRENT_DATE,  -- jour où le défi a été attribué
  UNIQUE(user_id, challenge_id, date_assigned)
);

-- 3. Streaks (séries de jours consécutifs avec au moins 1 challenge complété)
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active    DATE,
  total_points   INT NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Badges débloqués
CREATE TABLE IF NOT EXISTS user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug   TEXT NOT NULL,
  badge_emoji  TEXT NOT NULL,
  badge_label  TEXT NOT NULL,
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_slug)
);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_challenges_user    ON user_challenges(user_id, date_assigned);
CREATE INDEX IF NOT EXISTS idx_user_challenges_done    ON user_challenges(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_badges_user        ON user_badges(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE challenges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges     ENABLE ROW LEVEL SECURITY;

-- Challenges : lecture publique pour authentifiés
CREATE POLICY "challenges_read" ON challenges FOR SELECT TO authenticated USING (is_active = true);

-- user_challenges : CRUD sur ses propres lignes
CREATE POLICY "uc_select" ON user_challenges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "uc_insert" ON user_challenges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "uc_update" ON user_challenges FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_streaks : CRUD sur sa propre ligne
CREATE POLICY "streak_select" ON user_streaks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "streak_insert" ON user_streaks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "streak_update" ON user_streaks FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_badges : lecture propre, insert propre
CREATE POLICY "badges_select" ON user_badges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "badges_insert" ON user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── SEED : 20 challenges variés et amusants ───────────────────
INSERT INTO challenges (slug, titre, description, emoji, type, difficulte, points, badge_reward, action_type, action_count, order_index) VALUES

-- DAILY FACILE (quotidiens)
('daily_hello',        '👋 Premier Contact',     'Envoie un message créatif à une âme que tu n''as jamais contactée. Un mot qui vient du cœur.',                    '👋', 'daily',    'facile',    15, NULL,   'send_message',      1, 10),
('daily_like_art',     '🌹 Rose Dorée',           'Envoie une Rose à quelqu''un dont la devise t''a touché. Dis-leur pourquoi en 1 phrase.',                          '🌹', 'daily',    'facile',    10, NULL,   'send_like',         1, 20),
('daily_explore',      '🔭 Explorateur Céleste',  'Consulte 5 profils différents aujourd''hui. Chaque âme a une histoire.',                                          '🔭', 'daily',    'facile',    10, NULL,   'view_profiles',     5, 30),
('daily_map',          '🗺️ Chasseur d''Étoiles',  'Ouvre la Carte des Étoiles et découvre les âmes autour de toi.',                                                  '🗺️', 'daily',    'facile',    8,  NULL,   'visit_map',         1, 40),
('daily_bio',          '✍️ Ma Vérité du Jour',    'Mets à jour ta devise avec une pensée qui te correspond aujourd''hui.',                                            '✍️', 'daily',    'facile',    12, NULL,   'update_bio',        1, 50),

-- DAILY MOYEN
('daily_roman_write',  '📖 Plume d''Or',          'Publie une citation ou un poème dans le Roman d''Amour. Partage ta lumière.',                                     '📖', 'daily',    'moyen',     25, '✍️',  'write_roman',       1, 60),
('daily_3messages',    '💬 Tisseur de Liens',      'Engage 3 conversations différentes aujourd''hui. La connexion commence par un mot.',                              '💬', 'daily',    'moyen',     30, NULL,   'send_message',      3, 70),
('daily_song',         '🎵 Ma Mélodie',            'Mets à jour ta chanson de vie. Quelle musique te représente aujourd''hui ?',                                      '🎵', 'daily',    'moyen',     20, NULL,   'share_song',        1, 80),

-- WEEKLY DIFFICILE (hebdomadaires)
('weekly_7likes',      '⭐ Constellation de Cœurs','Envoie 7 likes différents cette semaine. Fais briller 7 étoiles.',                                              '⭐', 'weekly',   'difficile', 60, '💫',  'send_like',         7, 100),
('weekly_roman3',      '🌟 Conteur d''Âmes',       'Publie 3 contenus dans le Roman cette semaine : une citation, un poème, une histoire.',                         '🌟', 'weekly',   'difficile', 75, '🌟',  'write_roman',       3, 110),
('weekly_explore20',   '🪐 Voyageur Cosmique',     'Explore 20 profils différents cette semaine. L''univers romantique est infini.',                                '🪐', 'weekly',   'moyen',     50, NULL,   'view_profiles',    20, 120),
('weekly_profile',     '🪞 Portrait de l''Âme',    'Complète toutes les sections de ton profil : bio, devise, chanson, lettre secrète.',                            '🪞', 'weekly',   'difficile', 80, '🪞',  'complete_profile',  4, 130),

-- SOCIAL (interactifs)
('social_match_talk',  '💑 Le Grand Saut',         'Envoie un message à quelqu''un avec qui tu as un match. Brise la glace !',                                       '💑', 'social',   'moyen',     35, NULL,   'send_message',      1, 140),
('social_5new',        '🌈 Bâtisseur de Ponts',    'Contacte 5 personnes que tu n''as jamais eu en conversation.',                                                  '🌈', 'social',   'difficile', 55, '🌈',  'send_message',      5, 150),

-- CRÉATIF
('creative_poem',      '🌙 Poète de Minuit',        'Écris un poème de 4 vers dans le Roman. Laisse ton âme s''exprimer.',                                           '🌙', 'creative', 'moyen',     30, '🌙',  'write_roman',       1, 160),
('creative_history',   '💖 Notre Histoire',         'Publie une histoire vraie (ou imaginée) dans le Roman. Fais rêver les autres.',                                '💖', 'creative', 'difficile', 45, NULL,   'write_roman',       1, 170),

-- RÉFLEXION
('reflexion_lettre',   '💌 Lettre Secrète',         'Écris ou mets à jour ta lettre secrète dans ton profil. Que dirait ton cœur ?',                                '💌', 'reflexion','moyen',     25, '💌',  'complete_profile',  1, 180),
('reflexion_quiz',     '🔮 Oracle Personnel',       'Réponds à la question mystère du jour dans ton profil.',                                                        '🔮', 'reflexion','facile',    20, NULL,   'answer_quiz',       1, 190),

-- LÉGENDAIRE
('legend_30streak',    '🔥 Flamme Éternelle',       'Complète au moins 1 défi pendant 30 jours consécutifs. La constance est la plus belle des séductions.',        '🔥', 'weekly',   'legendaire',200,'🔥', 'manual',            1, 200),
('legend_100points',   '👑 Âme Couronnée',          'Accumule 100 points de défis. Tu es une constellation à part entière.',                                        '👑', 'weekly',   'legendaire',150,'👑', 'manual',            1, 210)

ON CONFLICT (slug) DO NOTHING;