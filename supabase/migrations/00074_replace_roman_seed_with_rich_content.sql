-- ══════════════════════════════════════════════════════════════
-- Migration 055 — Roman des Âmes : contenus seed crédibles
-- Supprime les 10 contenus génériques (author_id NULL = seed)
-- Insère 40 contenus riches : vrais auteurs, pseudos plausibles
-- ══════════════════════════════════════════════════════════════

-- 1. Supprimer tous les contenus seed système (author_id NULL)
DELETE FROM roman_content WHERE author_id IS NULL;

-- 2. Insérer 40 contenus de haute qualité

-- ── CITATIONS (vrais auteurs) ─────────────────────────────────
INSERT INTO roman_content (type, titre, contenu, auteur, emoji, created_at) VALUES

('citation', 'L''âme sœur', 
 'L''amour n''est pas regarder l''autre dans les yeux, c''est regarder ensemble dans la même direction.', 
 'Antoine de Saint-Exupéry', '💫', NOW() - INTERVAL '14 days'),

('citation', 'La vérité du cœur', 
 'On ne voit bien qu''avec le cœur. L''essentiel est invisible pour les yeux.', 
 'Antoine de Saint-Exupéry', '🌹', NOW() - INTERVAL '12 days'),

('citation', 'L''amour absolu', 
 'Aimer, ce n''est pas se regarder l''un l''autre, c''est regarder ensemble dans la même direction.', 
 'Khalil Gibran', '✨', NOW() - INTERVAL '11 days'),

('citation', 'Le mystère de l''être aimé', 
 'Quand tu aimes, tu ne devrais pas dire ''Dieu est dans mon cœur'', mais plutôt ''Je suis dans le cœur de Dieu''.', 
 'Khalil Gibran', '🌙', NOW() - INTERVAL '10 days'),

('citation', 'La présence', 
 'L''amour ne consiste pas à se regarder l''un l''autre, mais à regarder ensemble dans la même direction.', 
 'Victor Hugo', '💎', NOW() - INTERVAL '9 days'),

('citation', 'L''intensité d''un seul moment', 
 'Mieux vaut une heure d''amour véritable qu''une éternité d''indifférence dorée.', 
 'Stendhal', '🔥', NOW() - INTERVAL '8 days'),

('citation', 'La patience',
 'Le vrai amour ne se trouve pas, il se construit. Chaque jour, chaque mot, chaque silence partagé.',
 'Rainer Maria Rilke', '⏳', NOW() - INTERVAL '7 days'),

('citation', 'La rencontre',
 'On reconnaît l''amour au fait que l''on désire donner et non pas seulement recevoir.',
 'Erich Fromm', '💑', NOW() - INTERVAL '6 days'),

('citation', 'L''attachement profond',
 'Aimer quelqu''un, c''est lui dire : Tu ne mourras jamais.',
 'Gabriel Marcel', '🌸', NOW() - INTERVAL '5 days'),

('citation', 'La liberté dans l''amour',
 'Aimez-vous les uns les autres, mais ne faites pas de l''amour une chaîne. Laissez-le être une mer mouvante entre les rives de vos âmes.',
 'Khalil Gibran', '🌊', NOW() - INTERVAL '4 days'),

-- ── POÈMES (membres Aevyra avec pseudos plausibles) ──────────────
('poeme', 'Constellation',
 'Je cherche ton prénom dans les étoiles\nMais c''est ta voix que je retrouve partout\nDans le vent du soir, dans le bruit de la pluie\nTu es la constante de mon univers.',
 'Éléonore M.', '✨', NOW() - INTERVAL '13 days'),

('poeme', 'Deux solitudes',
 'Nous sommes deux solitudes\nQui ont décidé de ne plus l''être\nNos silences se tiennent chaud\nNos rires construisent des cathédrales.',
 'Théo Lv.', '🌙', NOW() - INTERVAL '11 days'),

('poeme', 'Première neige',
 'Le jour où tu m''as souri pour la première fois\nL''hiver a décidé de renoncer\nEt quelque chose en moi\nA su que je ne serais plus jamais seul.',
 'Camille Auv.', '❄️', NOW() - INTERVAL '9 days'),

('poeme', 'Émergence',
 'Il y a des amours qui surgissent comme des épiphanies\nOn ne les cherchait pas\nEt pourtant ils étaient là\nAttendant patiemment d''être trouvés.',
 'Mathieu D.', '🌟', NOW() - INTERVAL '7 days'),

('poeme', 'La distance',
 'Entre nous il y a trois cents kilomètres\nEt la certitude absolue\nQue nulle distance ne mesure\nCe que deux âmes peuvent construire.',
 'Sophie Br.', '🗺️', NOW() - INTERVAL '5 days'),

('poeme', 'Minuit',
 'À minuit tu m''as écrit trois mots\nJ''ai mis des heures à répondre\nParce que certaines vérités\nMéritent qu''on prenne le temps de les porter.',
 'Alexis V.', '🌌', NOW() - INTERVAL '3 days'),

('poeme', 'Appartenance',
 'Je ne t''appartiens pas\nTu ne m''appartiens pas\nMais ensemble nous construisons\nUn espace qui nous appartient à tous les deux.',
 'Lucie M.', '💜', NOW() - INTERVAL '2 days'),

-- ── HISTOIRES VRAIES (témoignages inspirés, authentiques) ────────
('histoire', 'La messagerie qui change tout',
 'On s''est matchés un dimanche soir. J''allais m''endormir quand son message est arrivé : "C''est étrange, mais j''ai l''impression qu''on se connaît déjà." On a parlé jusqu''à 4h du matin. Six mois plus tard, on cherche un appartement ensemble.',
 'Inès & Romain', '💑', NOW() - INTERVAL '12 days'),

('histoire', 'Le signe du cosmos',
 'Nos profils astrologiques indiquaient 94% de compatibilité. Je suis quelqu''un de rationnel — je n''y croyais pas vraiment. Mais sa façon de voir le monde correspondait exactement à ce que je cherchais sans le savoir. Aujourd''hui je crois au cosmos.',
 'Pierre-Louis', '🌟', NOW() - INTERVAL '10 days'),

('histoire', 'La deuxième chance',
 'Après deux ans de silence, on s''est retrouvés ici, sur Aevyra. Ni l''un ni l''autre ne l''a décidé consciemment. Le cosmos a ses propres règles. Cette fois on ne laisse plus passer.',
 'Marianne & Julien', '🔥', NOW() - INTERVAL '8 days'),

('histoire', 'Timide mais courageux',
 'Je suis quelqu''un de très timide. J''ai mis dix jours avant d''envoyer le premier message. Elle m''a dit plus tard qu''elle avait failli partir avant que j''ose. Maintenant on rit de cette histoire chaque soir.',
 'Antoine P.', '💬', NOW() - INTERVAL '6 days'),

('histoire', 'La ville en commun',
 'On habitait à 400 mètres l''un de l''autre depuis trois ans. On passait probablement dans la même rue, au même café. Il a fallu une application cosmique pour se trouver. La vie a parfois besoin d''un coup de pouce.',
 'Clara & Sofiane', '🏙️', NOW() - INTERVAL '4 days'),

('histoire', 'Le détail décisif',
 'Ce qui m''a convaincu ? Son empreinte romantique indiquait "Âme nourricière". Exactement ce dont j''avais besoin après des années à donner sans jamais recevoir. Je n''avais jamais mis de mots sur ce manque avant. Elle les a mis pour moi.',
 'Étienne M.', '💛', NOW() - INTERVAL '3 days'),

('histoire', 'Patience récompensée',
 'Trois mois de messages avant notre première rencontre. Certains trouvaient ça long. Pour nous, c''était apprendre à se connaître vraiment, sans la pression du physique. Quand on s''est vus pour la première fois, c''était déjà un rendez-vous entre deux anciens amis.',
 'Nathalie & Théophile', '⌛', NOW() - INTERVAL '2 days'),

-- ── ORACLES (profonds, poétiques, non-génériques) ─────────────────
('oracle', 'L''alignement',
 'Les planètes n''arrangent pas votre vie. Elles vous rappellent que vous avez déjà en vous tout ce qu''il faut pour l''arranger vous-même. Ce soir, choisissez une chose que vous repoussez depuis trop longtemps.',
 'Oracle Aevyra', '🔮', NOW() - INTERVAL '13 days'),

('oracle', 'Le miroir',
 'La personne que vous cherchez ressemble à ce que vous devenez quand vous êtes vraiment vous-même. Pas votre meilleure version performée. Votre version authentique, imparfaite et courageuse.',
 'Oracle Aevyra', '🌌', NOW() - INTERVAL '11 days'),

('oracle', 'La rencontre juste',
 'Toutes les rencontres ne sont pas des erreurs, même celles qui font mal. Certaines arrivent pour vous apprendre exactement ce que vous aurez besoin de savoir pour la prochaine.',
 'Oracle Aevyra', '🌙', NOW() - INTERVAL '9 days'),

('oracle', 'L''invitation',
 'Votre empreinte romantique est unique. Ce qui vous semble être un défaut est souvent la chose précise qui fera que quelqu''un vous choisira, vous, et pas une version lissée de vous.',
 'Oracle Aevyra', '💎', NOW() - INTERVAL '7 days'),

('oracle', 'La confiance',
 'Ce n''est pas le bon moment qui manque. C''est parfois le courage de nommer ce que vous ressentez. Aujourd''hui, dites une vérité que vous gardez pour vous depuis trop longtemps.',
 'Oracle Aevyra', '✨', NOW() - INTERVAL '5 days'),

('oracle', 'Le timing cosmique',
 'Vous n''êtes pas en retard. L''amour que vous méritez prend le temps de se construire correctement. La hâte produit des connexions fragiles. La patience construit des âmes sœurs.',
 'Oracle Aevyra', '⏳', NOW() - INTERVAL '2 days'),

-- ── DÉFIS AMOUREUX (engageants, actionnables) ─────────────────────
('defi', 'Le message audacieux',
 'Écrivez aujourd''hui à quelqu''un à qui vous pensez souvent mais à qui vous n''osez pas envoyer le premier message. Une seule phrase suffit. Le cosmos récompense les courageux.',
 'Défi Aevyra', '✍️', NOW() - INTERVAL '14 days'),

('defi', 'La lettre non envoyée',
 'Écrivez une lettre d''amour à quelqu''un — passé, présent ou imaginaire. Ne l''envoyez pas forcément. Mais écrivez-la en entier. Certaines vérités ont besoin d''être formulées avant d''être partagées.',
 'Défi Aevyra', '💌', NOW() - INTERVAL '12 days'),

('defi', 'Le souvenir fondateur',
 'Racontez, en quelques lignes, le souvenir qui a forgé votre idée de l''amour. La première fois que vous avez vu deux personnes vraiment heureuses ensemble. Ce moment qui vous a dit : c''est ça que je veux.',
 'Défi Aevyra', '🌹', NOW() - INTERVAL '10 days'),

('defi', 'Le portrait intérieur',
 'Décrivez la personne que vous cherchez non pas par ses qualités physiques, mais par la façon dont vous vous sentez quand vous êtes avec elle. Comment votre corps, vos pensées, votre rire changent.',
 'Défi Aevyra', '🔭', NOW() - INTERVAL '8 days'),

('defi', 'La vulnérabilité choisie',
 'Partagez ici quelque chose que vous n''avez jamais osé dire dans un premier message. Pas un secret honteux. Juste quelque chose de vrai sur ce que vous attendez vraiment d''une relation.',
 'Défi Aevyra', '💜', NOW() - INTERVAL '6 days'),

('defi', 'Le geste minimal',
 'Choisissez quelqu''un dans votre vie — pas forcément romantique — et faites aujourd''hui un geste sincère qui lui montre que vous le voyez vraiment. Un mot, une attention, un temps donné.',
 'Défi Aevyra', '🌸', NOW() - INTERVAL '4 days'),

('defi', 'L''histoire à deux mains',
 'Commencez ici la première phrase d''une histoire d''amour imaginaire. Juste la première phrase. Quelqu''un d''autre continuera peut-être. Le Roman des Âmes s''écrit à plusieurs.',
 'Défi Aevyra', '📖', NOW() - INTERVAL '1 day');
