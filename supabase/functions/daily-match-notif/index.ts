// Aevyra – Edge Function : Notif quotidienne "Âme compatible"
// Cron 8h UTC (9h Paris) — pg_cron → pg_net → cette fonction
//
// Scalabilité : traitement par pages de PAGE_SIZE profils (évite de charger
// toute la table en mémoire). Chaque page charge ses candidats compatibles
// depuis la DB (filtrés par signe — pas de O(N²) en mémoire).
//
// Algorithme de score : 5 dimensions propriétaires Aevyra alignées avec le
// front (D1 Résonance Astrale 25% · D2 Alchimie 22% · D3 Accord 18% ·
// D4 Harmonie 23% · D5 Synchronicité 12%).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const PAGE_SIZE     = 200; // profils traités par page (évite OOM sur grande base)
const PUSH_BATCH    = 100; // max par requête Expo Push API

// ── Algorithme 5D Aevyra (identique au front amour-api.ts) ────────────────
type Profile = {
  id: string; prenom: string; signe_astro: string; energie_romantique: string;
  genre: string; cherche: string; style_amour: string; reve_duo: string;
  moment_prefere: string; empreinte_couleur: string;
};

function d1ResonanceAstrale(a: Profile, b: Profile): number {
  if (!a.signe_astro || !b.signe_astro) return 50;
  const ELEMENT: Record<string, string> = {
    'Bélier':'Feu','Lion':'Feu','Sagittaire':'Feu',
    'Taureau':'Terre','Vierge':'Terre','Capricorne':'Terre',
    'Gémeaux':'Air','Balance':'Air','Verseau':'Air',
    'Cancer':'Eau','Scorpion':'Eau','Poissons':'Eau',
  };
  const TRINES: Record<string, string[]> = {
    'Bélier':['Lion','Sagittaire'],'Lion':['Bélier','Sagittaire'],'Sagittaire':['Bélier','Lion'],
    'Taureau':['Vierge','Capricorne'],'Vierge':['Taureau','Capricorne'],'Capricorne':['Taureau','Vierge'],
    'Gémeaux':['Balance','Verseau'],'Balance':['Gémeaux','Verseau'],'Verseau':['Gémeaux','Balance'],
    'Cancer':['Scorpion','Poissons'],'Scorpion':['Cancer','Poissons'],'Poissons':['Cancer','Scorpion'],
  };
  const SEXTILES: Record<string, string[]> = {
    'Bélier':['Gémeaux','Verseau'],'Lion':['Balance','Gémeaux'],'Sagittaire':['Balance','Verseau'],
    'Taureau':['Cancer','Poissons'],'Vierge':['Scorpion','Cancer'],'Capricorne':['Scorpion','Poissons'],
    'Gémeaux':['Bélier','Lion'],'Balance':['Sagittaire','Lion'],'Verseau':['Bélier','Sagittaire'],
    'Cancer':['Taureau','Vierge'],'Scorpion':['Capricorne','Vierge'],'Poissons':['Taureau','Capricorne'],
  };
  const OPPOSITIONS: Record<string, string> = {
    'Bélier':'Balance','Taureau':'Scorpion','Gémeaux':'Sagittaire',
    'Cancer':'Capricorne','Lion':'Verseau','Vierge':'Poissons',
    'Balance':'Bélier','Scorpion':'Taureau','Sagittaire':'Gémeaux',
    'Capricorne':'Cancer','Verseau':'Lion','Poissons':'Vierge',
  };
  const POLARITE: Record<string, string> = {
    'Bélier':'+','Lion':'+','Sagittaire':'+','Gémeaux':'+','Balance':'+','Verseau':'+',
    'Taureau':'-','Vierge':'-','Capricorne':'-','Cancer':'-','Scorpion':'-','Poissons':'-',
  };
  const ea = ELEMENT[a.signe_astro]; const eb = ELEMENT[b.signe_astro];
  if (!ea || !eb) return 50;
  if (a.signe_astro === b.signe_astro) return 78;
  if (TRINES[a.signe_astro]?.includes(b.signe_astro)) return 92;
  if (SEXTILES[a.signe_astro]?.includes(b.signe_astro)) return 82;
  if (OPPOSITIONS[a.signe_astro] === b.signe_astro) return 70;
  if (ea === eb) return 75;
  const pa = POLARITE[a.signe_astro]; const pb = POLARITE[b.signe_astro];
  if (pa && pb && pa !== pb) return 62;
  return 48;
}

function d2AlchimieEnergie(a: Profile, b: Profile): number {
  if (!a.energie_romantique || !b.energie_romantique) return 50;
  const T: Record<string, Record<string, number>> = {
    'Soleil ardent':     {'Soleil ardent':60,'Lune mystérieuse':95,'Étoile libre':80,'Comète passionnée':70},
    'Lune mystérieuse':  {'Soleil ardent':95,'Lune mystérieuse':65,'Étoile libre':72,'Comète passionnée':88},
    'Étoile libre':      {'Soleil ardent':80,'Lune mystérieuse':72,'Étoile libre':85,'Comète passionnée':76},
    'Comète passionnée': {'Soleil ardent':70,'Lune mystérieuse':88,'Étoile libre':76,'Comète passionnée':68},
  };
  return T[a.energie_romantique]?.[b.energie_romantique] ?? 55;
}

function d3AccordDesAmes(a: Profile, b: Profile): number {
  let s = 50;
  if (a.style_amour && b.style_amour) {
    if (a.style_amour === b.style_amour) s += 30;
    const COMP: Record<string, string[]> = {
      'Tendresse douce':  ['Paroles sincères','Présence totale'],
      'Paroles sincères': ['Tendresse douce','Cadeaux du cœur'],
      'Présence totale':  ['Tendresse douce','Actes concrets'],
      'Actes concrets':   ['Présence totale','Paroles sincères'],
      'Cadeaux du cœur':  ['Paroles sincères','Tendresse douce'],
    };
    if (COMP[a.style_amour]?.includes(b.style_amour)) s += 18;
  }
  if (a.reve_duo && b.reve_duo && a.reve_duo === b.reve_duo) s += 20;
  if (s === 50) s += 4;
  return Math.min(100, Math.max(30, s));
}

function d4HarmonieDesirée(a: Profile, b: Profile): number {
  if (!a.cherche || !b.cherche || !a.genre || !b.genre) return 55;
  const aVeutB = a.cherche === b.genre || a.cherche === 'une_ame' ||
    (a.cherche === 'les_deux' && ['femme','homme','autre'].includes(b.genre));
  const bVeutA = b.cherche === a.genre || b.cherche === 'une_ame' ||
    (b.cherche === 'les_deux' && ['femme','homme','autre'].includes(a.genre));
  if (aVeutB && bVeutA) return 95;
  if (aVeutB || bVeutA) return 65;
  return 25;
}

function d5SynchroniciteVie(a: Profile, b: Profile): number {
  let s = 50;
  if (a.moment_prefere && b.moment_prefere) {
    if (a.moment_prefere === b.moment_prefere) s += 22;
    const R: Record<string, string[]> = {
      'Lever du soleil':  ['Coucher du soleil','Nuit étoilée'],
      'Coucher du soleil':['Lever du soleil','Après-midi doré'],
      'Nuit étoilée':     ['Lever du soleil','Minuit mystérieux'],
      'Après-midi doré':  ['Coucher du soleil','Matin calme'],
      'Minuit mystérieux':['Nuit étoilée','Après-midi doré'],
      'Matin calme':      ['Après-midi doré','Lever du soleil'],
    };
    if (R[a.moment_prefere]?.includes(b.moment_prefere)) s += 14;
  }
  if (a.empreinte_couleur && b.empreinte_couleur) {
    const C: Record<string, string[]> = {
      'Violet profond':['Or doux','Rose pâle'],
      'Or doux':       ['Violet profond','Bleu nuit'],
      'Rose pâle':     ['Violet profond','Turquoise'],
      'Bleu nuit':     ['Or doux','Corail'],
      'Turquoise':     ['Rose pâle','Corail'],
      'Corail':        ['Bleu nuit','Turquoise'],
    };
    if (a.empreinte_couleur === b.empreinte_couleur) s += 8;
    if (C[a.empreinte_couleur]?.includes(b.empreinte_couleur)) s += 14;
  }
  if (s === 50) s += 3;
  return Math.min(100, Math.max(30, s));
}

/** Score global 5D pondéré — identique amour-api.ts front (D1·25 D2·22 D3·18 D4·23 D5·12) */
function computeScore(a: Profile, b: Profile): number {
  const total = Math.round(
    d1ResonanceAstrale(a, b) * 0.25 +
    d2AlchimieEnergie(a, b)  * 0.22 +
    d3AccordDesAmes(a, b)    * 0.18 +
    d4HarmonieDesirée(a, b)  * 0.23 +
    d5SynchroniciteVie(a, b) * 0.12,
  );
  return Math.min(100, Math.max(35, total));
}

// ── Handler principal ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  try {
    // Date du jour en Europe/Paris — la Edge Function tourne en UTC (Deno/Supabase),
    // donc on ne peut PAS utiliser toISOString().split('T')[0] (retourne UTC, pas Paris).
    // Intl.DateTimeFormat avec timeZone 'Europe/Paris' retourne la date locale correcte.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

    // 1. Vérifier qui a déjà reçu la notif aujourd'hui (idempotence)
    // Chargé en premier pour exclure au plus tôt (réduit le travail inutile)
    const { data: alreadySentRaw } = await supabase
      .from('daily_notif_log')
      .select('user_id')
      .eq('notif_date', today)
      .eq('notif_type', 'daily_match');
    const alreadySentIds = new Set((alreadySentRaw ?? []).map((r: { user_id: string }) => r.user_id));

    const messages:   object[] = [];
    const logInserts: object[] = [];
    let   totalProcessed = 0;

    // 2. Traitement paginé — évite de charger N×M profils en mémoire (OOM si 10K+ users)
    let page = 0;
    while (true) {
      // 2a. Page de tokens
      const { data: tokensPage, error: tokErr } = await supabase
        .from('push_tokens')
        .select('user_id, token')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (tokErr) throw tokErr;
      if (!tokensPage?.length) break; // plus de tokens

      const userIds = tokensPage.map((t: { user_id: string }) => t.user_id)
        .filter((id: string) => !alreadySentIds.has(id)); // skip déjà notifiés
      if (!userIds.length) { page++; continue; }

      // 2b. Profils de cette page (colonnes minimales pour le calcul 5D)
      const { data: pageProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, prenom, signe_astro, energie_romantique, genre, cherche, style_amour, reve_duo, moment_prefere, empreinte_couleur, inscription_complete')
        .in('id', userIds)
        .eq('inscription_complete', true);
      if (profErr) throw profErr;
      if (!pageProfiles?.length) { page++; continue; }
      totalProcessed += pageProfiles.length;

      // Map token rapide (O(1) lookup vs O(N) find)
      const tokenMap = new Map<string, string>(
        tokensPage.map((t: { user_id: string; token: string }) => [t.user_id, t.token]),
      );

      for (const user of pageProfiles as Profile[]) {
        const token = tokenMap.get(user.id);
        if (!token) continue;

        // 2c. Candidats compatibles — filtrés côté DB par genre (index eq)
        // Limite 50 candidats max — le meilleur émergera sans traiter toute la table
        let candidatesQuery = supabase
          .from('profiles')
          .select('id, prenom, signe_astro, energie_romantique, genre, cherche, style_amour, reve_duo, moment_prefere, empreinte_couleur')
          .eq('inscription_complete', true)
          .neq('id', user.id)
          .limit(50);

        // Filtre genre côté DB pour réduire drastiquement les candidats
        if (user.cherche === 'femme')  candidatesQuery = candidatesQuery.eq('genre', 'femme');
        else if (user.cherche === 'homme') candidatesQuery = candidatesQuery.eq('genre', 'homme');

        const { data: candidates } = await candidatesQuery;
        if (!candidates?.length) continue;

        // 2d. Score 5D — O(50) au lieu de O(N)
        let bestMatch = (candidates as Profile[])[0];
        let bestScore = 0;
        for (const c of candidates as Profile[]) {
          const s = computeScore(user, c);
          if (s > bestScore) { bestScore = s; bestMatch = c; }
        }

        messages.push({
          to:    token,
          title: '✨ Âme compatible trouvée',
          body:  `${bestMatch.prenom ?? 'Quelqu\'un'} est compatible avec vous à ${bestScore}% — découvrez-le sur Aevyra 🌙`,
          data:  { type: 'daily_match', userId: bestMatch.id, score: bestScore },
          sound: 'default',
          badge: 1,
        });
        logInserts.push({ user_id: user.id, notif_date: today, notif_type: 'daily_match' });
      }

      page++;
    }

    if (!messages.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'all already sent or no token' }), { status: 200 });
    }

    // 3. Envoyer les push en batch (max 100 par requête Expo)
    let sent = 0;
    for (let i = 0; i < messages.length; i += PUSH_BATCH) {
      const batch = messages.slice(i, i + PUSH_BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
      else console.error('[daily-match-notif] Expo push error', res.status, await res.text());
    }

    // 4. Logger les envois (idempotence garantie par unique constraint)
    if (logInserts.length > 0) {
      await supabase.from('daily_notif_log')
        .upsert(logInserts, { onConflict: 'user_id,notif_date,notif_type', ignoreDuplicates: true });
    }

    return new Response(JSON.stringify({ sent, total_processed: totalProcessed }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[daily-match-notif]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
