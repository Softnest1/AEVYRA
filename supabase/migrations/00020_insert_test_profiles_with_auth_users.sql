
-- Créer les auth.users de test (nécessaire avant profiles à cause de la FK)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role
)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'lea.cosmos@amour-test.fr',   '$2a$10$placeholder_hash_lea',   NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'sofia.lunar@amour-test.fr',  '$2a$10$placeholder_hash_sofia',  NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'emma.fire@amour-test.fr',    '$2a$10$placeholder_hash_emma',   NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'marco.leo@amour-test.fr',    '$2a$10$placeholder_hash_marco',  NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated'),
  ('aaaaaaaa-0005-0005-0005-000000000005', 'yasmine.dream@amour-test.fr','$2a$10$placeholder_hash_yasmine',NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated'),
  ('aaaaaaaa-0006-0006-0006-000000000006', 'lucas.moon@amour-test.fr',   '$2a$10$placeholder_hash_lucas',  NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Insérer les 6 profils de test réalistes et amusants
INSERT INTO profiles (
  id, prenom, pseudo, age, genre, cherche,
  signe_astro, energie_romantique, style_amour, moment_prefere,
  bio, devise, chanson_vie, lettre_secrete,
  tags, empreinte_couleur, photo_url,
  inscription_complete, etape_inscription, is_verified, is_mystery,
  notif_enabled, synchronicite_enabled, reve_duo, ville, latitude, longitude
) VALUES
-- 1. Léa — femme solaire, Bélier, cherche homme
(
  'aaaaaaaa-0001-0001-0001-000000000001',
  'Léa', 'leacosmos', 27, 'femme', 'homme',
  'Bélier', 'Soleil ardent', 'Passionnément', 'Coucher de soleil',
  'Amoureuse des voyages impromptus et des cafés qui ferment à minuit. Je danse sous la pluie et j''assume complètement 🌧️',
  'Vivre comme si chaque jour était le premier.',
  'Golden Hour – JVKE',
  'Je t''écris depuis un café parisien sous la pluie. Si tu lis ceci, c''est que l''univers a bien fait les choses 💌',
  ARRAY['Voyages', 'Danse', 'Cuisine italienne', 'Philosophie'],
  '#FF6B6B', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
  true, 5, true, false, true, true,
  'Partir vivre 6 mois dans un pays inconnu ensemble', 'Paris', 48.8566, 2.3522
),
-- 2. Sofia — femme mystérieuse, Scorpion, cherche homme
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  'Sofia', 'sofialunar', 24, 'femme', 'homme',
  'Scorpion', 'Lune mystérieuse', 'Profondément', 'Nuit étoilée',
  'Artiste peintre le jour, astronome amateur la nuit 🔭 Je parle aux étoiles et parfois elles répondent.',
  'Les âmes profondes ont des silences qui valent mille mots.',
  'Clair de Lune – Debussy',
  'Je ne crois pas au hasard. Si tu es là, c''est parce que ton énergie a trouvé la mienne dans l''immensité 🌌',
  ARRAY['Peinture', 'Astronomie', 'Méditation', 'Jazz'],
  '#C084FC', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
  true, 5, false, false, true, true,
  'Construire un observatoire personnel ensemble', 'Lyon', 45.7640, 4.8357
),
-- 3. Emma — femme aventurière, Sagittaire, cherche les deux
(
  'aaaaaaaa-0003-0003-0003-000000000003',
  'Emma', 'emmafire', 29, 'femme', 'les_deux',
  'Sagittaire', 'Comète passionnée', 'Librement', 'Aventure spontanée',
  'Guide de randonnée le week-end, développeuse la semaine. Je code des apps le lundi et j''escalade des sommets le samedi ⛰️',
  'La vie est trop courte pour les chemins tout tracés.',
  'Running Up That Hill – Kate Bush',
  'Mon rêve le plus fou ? Disparaître 3 mois avec quelqu''un de bien et revenir différente. Prêt·e à tenter l''aventure ? 🧗',
  ARRAY['Randonnée', 'Code', 'Escalade', 'Van life'],
  '#FFB347', 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80',
  true, 5, false, false, true, false,
  'Traverser l''Europe à vélo ensemble', 'Grenoble', 45.1885, 5.7245
),
-- 4. Marco — homme charismatique, Lion, cherche femme
(
  'aaaaaaaa-0004-0004-0004-000000000004',
  'Marco', 'marcoleo', 31, 'homme', 'femme',
  'Lion', 'Soleil ardent', 'Passionnément', 'Soirée animée',
  'Chef cuisinier passionné 👨‍🍳 Je nourris les gens et les émotions. Ma spécialité : les dîners improvisés à 23h pour 10 personnes.',
  'Aimer c''est inventer chaque jour une nouvelle raison de revenir.',
  'Can''t Help Falling in Love – Elvis',
  'Je t''offrirais le meilleur repas de ta vie. Et si tu aimes ça, on recommence jusqu''à la fin des temps 🍝',
  ARRAY['Gastronomie', 'Voyage', 'Football', 'Cinéma'],
  '#FF8C00', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
  true, 5, false, false, true, true,
  'Ouvrir un petit restaurant sur le bord de mer', 'Marseille', 43.2965, 5.3698
),
-- 5. Yasmine — femme douce, Poissons, cherche homme
(
  'aaaaaaaa-0005-0005-0005-000000000005',
  'Yasmine', 'yasminedream', 26, 'femme', 'homme',
  'Poissons', 'Lune mystérieuse', 'Profondément', 'Matin câlin',
  'Psychologue le jour, lectrice compulsive la nuit 📚 120 livres par an, 0 regret. Je cherche quelqu''un à qui lire des passages à voix haute.',
  'Les belles histoires ne se lisent pas, elles se vivent.',
  'La Vie en Rose – Édith Piaf',
  'Je te lirai mon passage préféré dès qu''on se sentira prêts tous les deux. En attendant, voici un indice : ça parle de toi, sans que je t''aie encore rencontré 📖',
  ARRAY['Lecture', 'Psychologie', 'Thé', 'Aquarelle'],
  '#87CEEB', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
  true, 5, false, false, true, true,
  'Créer une bibliothèque commune remplie de post-its', 'Bordeaux', 44.8378, -0.5792
),
-- 6. Lucas — homme tendre, Capricorne, cherche une_ame
(
  'aaaaaaaa-0006-0006-0006-000000000006',
  'Lucas', 'lucasmoon', 28, 'homme', 'une_ame',
  'Capricorne', 'Étoile libre', 'Librement', 'Nuit étoilée',
  'Musicien et prof de yoga 🎸🧘 Je compose des chansons sur les gens que je rencontre. T''en mérites peut-être une.',
  'La musique dit ce que les mots n''osent pas.',
  'Fix You – Coldplay',
  'J''ai déjà composé le début d''une chanson pour toi. Il me manque juste ta voix pour la finir 🎵',
  ARRAY['Musique', 'Yoga', 'Nature', 'Photographie'],
  '#9B59B6', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
  true, 5, false, false, true, true,
  'Partir en tour acoustique dans les petits villages', 'Nantes', 47.2184, -1.5536
)
ON CONFLICT (id) DO UPDATE SET
  prenom = EXCLUDED.prenom,
  bio = EXCLUDED.bio,
  inscription_complete = EXCLUDED.inscription_complete,
  photo_url = EXCLUDED.photo_url;
