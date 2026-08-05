
-- =============================================
-- ÂMOUR - La Rencontre des Âmes
-- Schéma complet de la base de données
-- =============================================

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: profiles
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL DEFAULT '',
  date_naissance DATE,
  signe_astro TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  genre TEXT DEFAULT '' CHECK (genre IN ('femme', 'homme', 'autre', '')),
  cherche TEXT DEFAULT '' CHECK (cherche IN ('femme', 'homme', 'les_deux', 'une_ame', '')),
  energie_romantique TEXT DEFAULT '',
  reve_duo TEXT DEFAULT '',
  style_amour TEXT DEFAULT '',
  moment_prefere TEXT DEFAULT '',
  devise TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  chanson_vie TEXT DEFAULT '',
  lettre_secrete TEXT DEFAULT '',
  empreinte_couleur TEXT DEFAULT '#FFD700',
  photo_url TEXT DEFAULT '',
  is_mystery BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  inscription_complete BOOLEAN DEFAULT FALSE,
  etape_inscription INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil visible par tous les utilisateurs connectés"
  ON profiles FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "Profil créé par l'utilisateur lui-même"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Profil modifiable par l'utilisateur lui-même"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Profil supprimable par l'utilisateur lui-même"
  ON profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- Auto-création de profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TABLE: likes (actions romantiques)
-- =============================================
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('rose', 'etoile', 'coeur', 'plume', 'flamme')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses propres likes"
  ON likes FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Envoyer un like"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Supprimer son like"
  ON likes FOR DELETE TO authenticated
  USING (from_user_id = auth.uid());

-- =============================================
-- TABLE: matches
-- =============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compatibilite INTEGER DEFAULT 0 CHECK (compatibilite >= 0 AND compatibilite <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses matches"
  ON matches FOR SELECT TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Créer un match"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- =============================================
-- TABLE: messages
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  is_whisper BOOLEAN DEFAULT FALSE,
  capsule_time TIMESTAMPTZ,
  is_capsule_delivered BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Helper pour vérifier si l'utilisateur fait partie d'un match
CREATE OR REPLACE FUNCTION public.user_in_match(match_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_uuid
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  );
$$;

CREATE POLICY "Voir les messages de ses matches"
  ON messages FOR SELECT TO authenticated
  USING (public.user_in_match(match_id));

CREATE POLICY "Envoyer un message"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.user_in_match(match_id));

CREATE POLICY "Modifier son message"
  ON messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Supprimer son message"
  ON messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- =============================================
-- TABLE: roman_content (Fil Roman d'Amour)
-- =============================================
CREATE TABLE roman_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('citation', 'poeme', 'oracle', 'histoire', 'defi')),
  titre TEXT DEFAULT '',
  contenu TEXT NOT NULL,
  auteur TEXT DEFAULT 'Âmour',
  emoji TEXT DEFAULT '💫',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roman_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contenu visible par tous les connectés"
  ON roman_content FOR SELECT TO authenticated
  USING (TRUE);

-- Contenu initial romantique
INSERT INTO roman_content (type, titre, contenu, auteur, emoji) VALUES
  ('citation', 'L''amour véritable', 'L''amour n''est pas regarder l''autre dans les yeux, c''est regarder ensemble dans la même direction.', 'Antoine de Saint-Exupéry', '💫'),
  ('citation', 'La rencontre des âmes', 'Il existe une flamme en chaque être, attendant l''âme sœur pour s''embraser ensemble.', 'Âmour', '🔥'),
  ('poeme', 'Étoile du soir', 'Quand les étoiles s''allument\nJe cherche ton visage dans le ciel\nChaque constellation murmure ton nom\nEt la nuit devient notre premier rendez-vous.', 'Âmour', '✨'),
  ('oracle', 'Conseil du jour', 'Osez aujourd''hui ce que votre cœur murmure depuis si longtemps. L''amour récompense les courageux.', 'L''Oracle des Âmes', '🔮'),
  ('citation', 'La patience amoureuse', 'L''attente n''est pas vide. Elle est pleine de tout ce qui sera.', 'Âmour', '⏳'),
  ('histoire', 'Léa & Thomas', 'Ils se sont rencontrés sur Âmour un soir de novembre. Leur première conversation a duré 8 heures. Aujourd''hui, ils se marient au printemps.', 'Histoire vraie', '💑'),
  ('poeme', 'Deux âmes', 'Deux âmes qui se cherchent\nDans l''infini des possibles\nSe reconnaissent au premier regard\nComme deux étoiles perdues qui se retrouvent.', 'Âmour', '🌟'),
  ('defi', 'Défi du jour', 'Écrivez aujourd''hui la première phrase de votre histoire d''amour, comme si vous la racontiez à vos enfants.', 'Âmour', '✍️'),
  ('oracle', 'Sagesse', 'Votre empreinte romantique unique attire exactement l''âme qui vous est destinée. Faites confiance au cosmos.', 'L''Oracle des Âmes', '🌌'),
  ('citation', 'L''instant magique', 'L''amour commence au moment où l''on décide de prendre soin de quelqu''un d''autre plus que de soi-même.', 'Fyodor Dostoïevski', '💎');

-- =============================================
-- TABLE: events (Événements Nuit Magique)
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('speed_dating', 'defi', 'soiree', 'atelier')),
  date_event TIMESTAMPTZ NOT NULL,
  lieu TEXT DEFAULT 'En ligne',
  emoji TEXT DEFAULT '🎪',
  participants_max INTEGER DEFAULT 20,
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Événements visibles par tous"
  ON events FOR SELECT TO authenticated
  USING (TRUE);

-- Données initiales
INSERT INTO events (titre, description, type, date_event, lieu, emoji, participants_max, participants_count) VALUES
  ('Speed Dating Étoilé ✨', 'Une soirée de rencontres express sous les étoiles. 5 minutes pour créer une étincelle éternelle.', 'speed_dating', NOW() + INTERVAL '3 days', 'Paris - Toit du Monde', '⭐', 20, 7),
  ('Défi Poésie Amoureuse', 'Partagez votre plus beau poème d''amour et gagnez un match exclusif avec votre plus haute compatibilité.', 'defi', NOW() + INTERVAL '1 day', 'En ligne', '✍️', 100, 43),
  ('Soirée Mystère & Romance', 'Rencontrez des âmes sans révéler votre identité. Uniquement vos mots, vos idées, votre essence.', 'soiree', NOW() + INTERVAL '7 days', 'Lyon - Château des Âmes', '🎭', 30, 12),
  ('Atelier Lettre d''Amour', 'Apprenez à écrire la lettre qui fera battre le cœur de votre âme sœur.', 'atelier', NOW() + INTERVAL '5 days', 'En ligne', '💌', 50, 28);

-- =============================================
-- TABLE: event_inscriptions
-- =============================================
CREATE TABLE event_inscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_inscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses inscriptions"
  ON event_inscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "S'inscrire à un événement"
  ON event_inscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Se désinscrire"
  ON event_inscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- STORAGE BUCKET: avatars
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars publics en lecture"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Upload avatar par l'utilisateur"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Modifier son avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supprimer son avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
