
-- ═══════════════════════════════════════════════════════════════════
-- APPELS VIDÉO — Tables video_calls + call_challenges + signaling
-- ═══════════════════════════════════════════════════════════════════

-- Questions pour l'épreuve d'accès à l'appel vidéo
CREATE TABLE call_challenge_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question    text NOT NULL,
  options     jsonb NOT NULL,   -- ["option A", "option B", "option C", "option D"]
  answer_idx  int  NOT NULL,    -- index de la bonne réponse (0-3)
  category    text NOT NULL DEFAULT 'amour',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_challenge_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions lisibles par tous les authentifiés"
  ON call_challenge_questions FOR SELECT
  TO authenticated USING (true);

-- Épreuves par appel — chaque participant doit réussir 3 questions
CREATE TABLE call_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         uuid NOT NULL,  -- référence à video_calls (ajoutée après)
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  questions       jsonb NOT NULL, -- [{id, question, options, answer_idx}] x3 tirées aléatoirement
  answers         jsonb,          -- {0: idx_choisi, 1: idx_choisi, 2: idx_choisi}
  passed          boolean,        -- null = pas encore soumis, true/false après
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir ses propres épreuves"
  ON call_challenges FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Créer ses épreuves"
  ON call_challenges FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Mettre à jour ses épreuves"
  ON call_challenges FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Appels vidéo
CREATE TABLE video_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'ringing'
                  CHECK (status IN ('ringing','challenge_pending','in_progress','ended','rejected','missed')),
  -- Scores épreuves
  caller_passed   boolean,
  callee_passed   boolean,
  -- WebRTC signaling stocké en DB (pas besoin de serveur dédié)
  offer_sdp       text,
  answer_sdp      text,
  -- ICE candidates stockés comme tableaux JSON
  caller_ice      jsonb DEFAULT '[]'::jsonb,
  callee_ice      jsonb DEFAULT '[]'::jsonb,
  -- Timing
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

-- FK différée pour call_challenges.call_id
ALTER TABLE call_challenges
  ADD CONSTRAINT call_challenges_call_id_fkey
  FOREIGN KEY (call_id) REFERENCES video_calls(id) ON DELETE CASCADE;

-- RLS video_calls : les deux participants peuvent voir + modifier
CREATE POLICY "Participants voient l'appel"
  ON video_calls FOR SELECT
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Appelant crée l'appel"
  ON video_calls FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Participants mettent à jour l'appel"
  ON video_calls FOR UPDATE
  TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Index pour polling rapide
CREATE INDEX idx_video_calls_callee ON video_calls(callee_id, status);
CREATE INDEX idx_video_calls_caller ON video_calls(caller_id, status);
CREATE INDEX idx_call_challenges_call ON call_challenges(call_id, user_id);

-- ─── Seed questions romantiques pour l'épreuve ───────────────────
INSERT INTO call_challenge_questions (question, options, answer_idx, category) VALUES
('Quelle est la clé d''une relation durable ?',
 '["La passion physique","La confiance et le respect","L''argent","La beauté"]', 1, 'amour'),
('Si ton/ta partenaire est triste, que fais-tu en premier ?',
 '["Tu l''ignores","Tu lui offres des cadeaux","Tu l''écoutes sans juger","Tu lui donnes des conseils immédiats"]', 2, 'amour'),
('Quel est le geste le plus romantique selon toi ?',
 '["Dépenser beaucoup","Retenir les petits détails qui comptent pour l''autre","Être jaloux/jalouse","Envoyer des fleurs une fois par an"]', 1, 'amour'),
('Comment exprimes-tu ton amour au quotidien ?',
 '["Je ne dis jamais rien","Seulement lors des grandes occasions","Par des petits gestes et mots sincères chaque jour","Je pense que c''est évident"]', 2, 'amour'),
('Qu''est-ce que l''amour véritable pour toi ?',
 '["Posséder l''autre","Aimer l''autre tel qu''il est vraiment","Changer l''autre","Être admiré/e"]', 1, 'amour'),
('Face à un désaccord, quelle est ta réaction idéale ?',
 '["Crier pour avoir raison","Fuir la conversation","Chercher à comprendre le point de vue de l''autre","Bouder jusqu''à ce que l''autre s''excuse"]', 2, 'amour'),
('Le "love language" (langage d''amour) qu''est-ce que c''est ?',
 '["Une langue étrangère","La façon dont chacun exprime et reçoit l''amour","Un livre de poèmes","Un style musical"]', 1, 'general'),
('Quelle qualité est la plus importante chez un partenaire ?',
 '["La richesse","La beauté physique","L''honnêteté","La popularité"]', 2, 'amour'),
('Comment construire une connexion profonde avec quelqu''un ?',
 '["En parlant uniquement de soi","En partageant ses vraies émotions et vulnérabilités","En impressionnant par ses succès","En restant mystérieux/se tout le temps"]', 1, 'amour'),
('Qu''est-ce qui différencie l''amour de l''obsession ?',
 '["Rien, c''est pareil","L''amour respecte la liberté de l''autre","L''obsession est plus intense donc c''est de l''amour","Le temps passé ensemble"]', 1, 'amour'),
('Quel est le secret d''un premier appel vidéo réussi ?',
 '["Parler sans s''arrêter","Être naturel/le et curieux/se de l''autre","Montrer sa maison","Parler de ses ex"]', 1, 'general'),
('Que signifie ''âme sœur'' pour toi ?',
 '["Quelqu''un de parfait","Quelqu''un avec qui on grandit et on s''accepte mutuellement","Une personne identique à soi","Quelqu''un de riche et beau"]', 1, 'amour');
