
INSERT INTO challenges (type, slug, titre, description, emoji, points, difficulte, action_type, action_count, badge_reward, order_index, is_active)
VALUES
  ('daily','ciel-etoile','🌠 Contemple le Ciel','Ferme les yeux 2 minutes et visualise ton ciel ideal. Qu''est-ce que tu y vois ?','🌠',30,'facile','manual',1,NULL,100,true),
  ('daily','gratitude-3','🙏 3 Gratitudes','Ecris 3 choses pour lesquelles tu es reconnaissant(e) aujourd''hui. La lumiere est partout.','🙏',35,'facile','manual',1,NULL,101,true),
  ('daily','intention-matin','☀️ Intention du Matin','Quelle est ton intention pour aujourd''hui ? Une phrase, une emotion, une direction.','☀️',30,'facile','write_intention',1,NULL,102,true),
  ('daily','message-bienveillant','💌 Message Bienveillant','Envoie un message d''encouragement a quelqu''un. Les mots ont un poids cosmique.','💌',50,'moyen','send_message',1,NULL,103,true),
  ('daily','respiration','🫧 Respiration Cosmique','Pratique 5 respirations profondes en imaginant que tu absorbes l''energie de l''univers.','🫧',25,'facile','manual',1,NULL,104,true),
  ('daily','curiosite-signe','🔭 Curiosite Astrale','Lis quelque chose sur ton signe astro et partage ce qui te surprend le plus.','🔭',40,'moyen','manual',1,NULL,105,true),
  ('daily','sourire-univers','✨ Sourire a l''Univers','Souris sincerement a 3 personnes aujourd''hui. L''energie que tu donnes revient amplifiee.','✨',30,'facile','manual',1,NULL,106,true),
  ('daily','decouverte-profil','👁️ Ame Inconnue','Consulte le profil d''une personne que tu ne connais pas encore. Qu''est-ce qui t''attire ?','👁️',45,'moyen','view_profiles',1,NULL,107,true),
  ('daily','musique-moment','🎶 Frequence du Jour','Ecoute une chanson qui correspond exactement a ton etat d''ame en ce moment.','🎶',30,'facile','manual',1,NULL,108,true)
ON CONFLICT (slug) DO NOTHING;
