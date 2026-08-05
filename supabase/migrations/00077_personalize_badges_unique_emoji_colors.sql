-- ════════════════════════════════════════════════════════════════════════
-- Migration : Personnalisation badge_reward — emoji unique + slug par challenge
-- Chaque badge devient distinct visuellement (emoji + identité propre)
-- ════════════════════════════════════════════════════════════════════════

-- 1. Ajouter colonne badge_color sur challenges (optionnel — pour le front)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT NULL;

-- 2. Mettre à jour chaque challenge avec un badge_reward unique + badge_color
--    Format badge_color : teinte hex principale du badge
UPDATE public.challenges SET
  badge_reward = '🌸', badge_color = '#FFB7C5'
  WHERE slug = 'daily_hello';

UPDATE public.challenges SET
  badge_reward = '🌹', badge_color = '#E8526A'
  WHERE slug = 'daily_like_art';

UPDATE public.challenges SET
  badge_reward = '🔭', badge_color = '#7EC8E3'
  WHERE slug = 'daily_explore';

UPDATE public.challenges SET
  badge_reward = '🗺️', badge_color = '#89CFF0'
  WHERE slug = 'daily_map';

UPDATE public.challenges SET
  badge_reward = '✍️', badge_color = '#C3B1E1'
  WHERE slug = 'daily_bio';

UPDATE public.challenges SET
  badge_reward = '📖', badge_color = '#FFD700'
  WHERE slug = 'daily_roman_write';

UPDATE public.challenges SET
  badge_reward = '💬', badge_color = '#98D8C8'
  WHERE slug = 'daily_3messages';

UPDATE public.challenges SET
  badge_reward = '🎵', badge_color = '#FF9EAF'
  WHERE slug = 'daily_song';

UPDATE public.challenges SET
  badge_reward = '💫', badge_color = '#E8D5FF'
  WHERE slug = 'weekly_7likes';

UPDATE public.challenges SET
  badge_reward = '📜', badge_color = '#FFE4B5'
  WHERE slug = 'weekly_roman3';

UPDATE public.challenges SET
  badge_reward = '🪐', badge_color = '#B5D5FF'
  WHERE slug = 'weekly_explore20';

UPDATE public.challenges SET
  badge_reward = '🪞', badge_color = '#D4EFDF'
  WHERE slug = 'weekly_profile';

UPDATE public.challenges SET
  badge_reward = '💑', badge_color = '#FFB347'
  WHERE slug = 'social_match_talk';

UPDATE public.challenges SET
  badge_reward = '🌈', badge_color = '#AEDFF7'
  WHERE slug = 'social_5new';

UPDATE public.challenges SET
  badge_reward = '🌙', badge_color = '#9B59B6'
  WHERE slug = 'creative_poem';

UPDATE public.challenges SET
  badge_reward = '💖', badge_color = '#FF6B9D'
  WHERE slug = 'creative_history';

UPDATE public.challenges SET
  badge_reward = '💌', badge_color = '#FF8FAB'
  WHERE slug = 'reflexion_lettre';

UPDATE public.challenges SET
  badge_reward = '🔮', badge_color = '#845EC2'
  WHERE slug = 'reflexion_quiz';

UPDATE public.challenges SET
  badge_reward = '🔥', badge_color = '#FF6B35'
  WHERE slug = 'legend_30streak';

UPDATE public.challenges SET
  badge_reward = '👑', badge_color = '#FFD700'
  WHERE slug = 'legend_100points';

-- Défis originaux (migration 00045)
UPDATE public.challenges SET
  badge_reward = '🌀', badge_color = '#A29BFE'
  WHERE slug = 'daily_vibration';

UPDATE public.challenges SET
  badge_reward = '🌠', badge_color = '#74B9FF'
  WHERE slug = 'daily_astro_soul';

UPDATE public.challenges SET
  badge_reward = '🪟', badge_color = '#DFE6E9'
  WHERE slug = 'daily_mirror';

UPDATE public.challenges SET
  badge_reward = '💜', badge_color = '#D980FA'
  WHERE slug = 'daily_cosmic_3';

UPDATE public.challenges SET
  badge_reward = '🌑', badge_color = '#636E72'
  WHERE slug = 'daily_silence';

UPDATE public.challenges SET
  badge_reward = '✨', badge_color = '#FFEAA7'
  WHERE slug = 'reflexion_constellation';

UPDATE public.challenges SET
  badge_reward = '📿', badge_color = '#FD79A8'
  WHERE slug = 'reflexion_healing';

UPDATE public.challenges SET
  badge_reward = '⚡', badge_color = '#FDCB6E'
  WHERE slug = 'reflexion_energy';

UPDATE public.challenges SET
  badge_reward = '⭐', badge_color = '#F9CA24'
  WHERE slug = 'reflexion_starlight';

UPDATE public.challenges SET
  badge_reward = '👁️', badge_color = '#55EFC4'
  WHERE slug = 'social_astro_3';

UPDATE public.challenges SET
  badge_reward = '🕯️', badge_color = '#FAB1A0'
  WHERE slug = 'social_warmth';

UPDATE public.challenges SET
  badge_reward = '🌟', badge_color = '#FDDB92'
  WHERE slug = 'social_7souls';

UPDATE public.challenges SET
  badge_reward = '🌌', badge_color = '#2D3436'
  WHERE slug = 'creative_cosmos';

UPDATE public.challenges SET
  badge_reward = '☯️', badge_color = '#B2BEC3'
  WHERE slug = 'creative_duality';

UPDATE public.challenges SET
  badge_reward = '🔭', badge_color = '#0984E3'
  WHERE slug = 'weekly_astro_7';

-- 3. Ajouter badge_color sur user_badges pour stocker la couleur au moment du déblocage
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT NULL;