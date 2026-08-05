
-- 1. Élargir le CHECK constraint pour accepter les nouveaux types
ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_action_type_check;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'send_message', 'send_like', 'write_roman', 'view_profiles',
    'update_bio', 'complete_profile', 'share_song', 'answer_quiz',
    'visit_map', 'manual',
    'astro_comment', 'write_intention'
  ]));

-- 2. Insérer les 15 défis originaux Aevyra
INSERT INTO public.challenges
  (slug, titre, description, emoji, type, difficulte, action_type, action_count, points, badge_reward, is_active, order_index)
VALUES
-- ── DAILY ORIGINAUX ──────────────────────────────────────────────────────────
  ('daily_vibration',    '🔮 Ma Vibration du Jour',
   'Écris une intention secrète pour cette journée — une phrase que tu gardes pour toi, gravée dans les étoiles.',
   '🔮', 'daily', 'moyen', 'write_intention', 1, 22, NULL, true, 105),

  ('daily_astro_soul',   '🌠 Lis l''Âme d''un Inconnu',
   'Visite le profil d''une personne que tu ne connais pas et laisse un commentaire astrologique sincère sur son énergie.',
   '🌠', 'daily', 'moyen', 'astro_comment', 1, 28, NULL, true, 106),

  ('daily_mirror',       '🪞 Mon Reflet du Soir',
   'Écris une vérité que tu as apprise sur toi-même aujourd''hui. Pas une leçon — une vraie découverte.',
   '🪞', 'daily', 'facile', 'write_intention', 1, 15, NULL, true, 107),

  ('daily_cosmic_3',     '💜 Triple Bienveillance',
   'Envoie de la bienveillance sincère à 3 âmes différentes que tu n''as jamais approchées.',
   '💜', 'daily', 'moyen', 'send_like', 3, 25, NULL, true, 108),

  ('daily_silence',      '🌙 Écoute du Cosmos',
   'Explore 3 profils en silence — sans like, sans message. Juste ressentir leurs énergies.',
   '🌙', 'daily', 'facile', 'view_profiles', 3, 10, NULL, true, 109),

-- ── REFLEXION ORIGINAUX ───────────────────────────────────────────────────────
  ('reflexion_constellation', '✨ Bâtis ta Constellation',
   'Complète au moins un champ de ton profil astrologique (ascendant, planète dominante, ou élément).',
   '✨', 'reflexion', 'moyen', 'complete_profile', 1, 30, '✨', true, 110),

  ('reflexion_healing',  '📿 Haïku de Lumière',
   'Écris le chapitre le plus court de ton Roman — un haïku de 3 lignes sur ce que tu ressens en ce moment.',
   '📿', 'reflexion', 'difficile', 'write_roman', 1, 40, '📿', true, 111),

  ('reflexion_energy',   '⚡ Quelle est ton Énergie ?',
   'Mets à jour ta bio avec l''énergie que tu dégages aujourd''hui : solaire ☀️, lunaire 🌙, feu 🔥 ou eau 💧.',
   '⚡', 'reflexion', 'facile', 'update_bio', 1, 18, NULL, true, 112),

  ('reflexion_starlight','🌟 Message à une Étoile',
   'Écris un chapitre de ton Roman adressé à quelqu''un que tu ne reverras jamais. Dis-lui tout ce que tu n''as pas dit.',
   '🌟', 'reflexion', 'difficile', 'write_roman', 1, 42, '🌟', true, 113),

-- ── SOCIAL ORIGINAUX ─────────────────────────────────────────────────────────
  ('social_astro_3',     '🌠 Lecteur d''Âmes',
   'Commente le profil astrologique de 3 inconnu(e)s avec une vraie lecture de leur énergie. Pas de banalité.',
   '🌠', 'social', 'difficile', 'astro_comment', 3, 60, '🌠', true, 114),

  ('social_warmth',      '🕯️ Porteur de Lumière',
   'Envoie un premier message sincère à quelqu''un dont le profil t''a touché — pas un simple "salut".',
   '🕯️', 'social', 'moyen', 'send_message', 1, 38, NULL, true, 115),

  ('social_7souls',      '💫 7 Âmes Touchées',
   'Envoie de la bienveillance à 7 âmes différentes en une seule journée. Des cœurs authentiques, pas du spam.',
   '💫', 'social', 'difficile', 'send_like', 7, 65, '💫', true, 116),

-- ── CREATIVE ORIGINAUX ───────────────────────────────────────────────────────
  ('creative_cosmos',    '🌌 Cartographe du Cosmos',
   'Écris le chapitre le plus mystérieux de ton Roman — celui que personne ne comprendra sauf toi.',
   '🌌', 'creative', 'legendaire', 'write_roman', 1, 70, '🌌', true, 117),

  ('creative_duality',   '☯️ Ma Dualité',
   'Écris deux chapitres opposés : l''un sur ta lumière, l''autre sur ton ombre. Sans mentir.',
   '☯️', 'creative', 'difficile', 'write_roman', 2, 55, NULL, true, 118),

-- ── WEEKLY ORIGINAL ──────────────────────────────────────────────────────────
  ('weekly_astro_7',     '🔭 Astronome des Âmes',
   'Lis et commente 7 profils astrologiques différents cette semaine. Chaque lecture doit être unique et sincère.',
   '🔭', 'weekly', 'legendaire', 'astro_comment', 7, 120, '🔭', true, 119)

ON CONFLICT (slug) DO NOTHING;
