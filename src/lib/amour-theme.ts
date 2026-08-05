// Aevyra – Constantes de thème cosmique

// ── Utilitaire partagé ────────────────────────────────────────────────────────
/** Générateur pseudo-aléatoire déterministe (même seed = même résultat, zéro flash) */
export function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export const COLORS = {
  cosmic: '#0D0D1A',
  violet: '#4B0082',
  bordeaux: '#722F37',
  gold: '#FFD700',
  goldDark: '#B8860B',
  rose: '#FFB6C1',
  roseDeep: '#FF69B4',
  purple: '#9B59B6',
  starWhite: '#F5F5F5',
  muted: 'rgba(255,255,255,0.45)',
};

export const GRADIENTS = {
  cosmic: ['#0D0D1A', '#1a0a2e', '#0D0D1A'] as const,
  violetCosmique: ['#0D0D1A', '#2d0a4e', '#4B0082'] as const,
  bordeauxOr: ['#722F37', '#4B0082', '#0D0D1A'] as const,
  roseNacre: ['#2d0a4e', '#722F37', '#FFB6C1'] as const,
  orSepia: ['#1a0a00', '#5a3000', '#8B6914'] as const,
  confetti: ['#0D0D1A', '#1a0a2e', '#2d0855'] as const,
};

export const SIGNES_ASTRO: Record<string, { emoji: string; description: string; element: string; couleur: string }> = {
  Bélier:     { emoji: '♈', description: 'Âme passionnée et audacieuse en amour',       element: 'Feu',  couleur: '#FF4500' },
  Taureau:    { emoji: '♉', description: 'Cœur fidèle qui aime avec constance',          element: 'Terre', couleur: '#8B6914' },
  Gémeaux:    { emoji: '♊', description: 'Esprit vif qui charme par ses mots',           element: 'Air',  couleur: '#87CEEB' },
  Cancer:     { emoji: '♋', description: 'Âme sensible qui aime avec profondeur',        element: 'Eau',  couleur: '#4169E1' },
  Lion:       { emoji: '♌', description: 'Cœur royal qui aime avec grandeur',            element: 'Feu',  couleur: '#FFD700' },
  Vierge:     { emoji: '♍', description: 'Âme dévouée qui aime dans les détails',        element: 'Terre', couleur: '#6B8E23' },
  Balance:    { emoji: '♎', description: 'Cœur harmonieux en quête d\'équilibre',        element: 'Air',  couleur: '#C084FC' },
  Scorpion:   { emoji: '♏', description: 'Âme intense qui aime jusqu\'au bout',          element: 'Eau',  couleur: '#8B0000' },
  Sagittaire: { emoji: '♐', description: 'Esprit libre qui aime sans frontières',        element: 'Feu',  couleur: '#FF8C00' },
  Capricorne: { emoji: '♑', description: 'Cœur solide qui construit l\'amour',           element: 'Terre', couleur: '#708090' },
  Verseau:    { emoji: '♒', description: 'Âme unique qui réinvente l\'amour',            element: 'Air',  couleur: '#00CED1' },
  Poissons:   { emoji: '♓', description: 'Cœur poétique noyé dans le romantisme',        element: 'Eau',  couleur: '#9370DB' },
};

export function getSigneAstro(dateNaissance: Date): string {
  const mois = dateNaissance.getMonth() + 1;
  const jour = dateNaissance.getDate();
  if ((mois === 3 && jour >= 21) || (mois === 4 && jour <= 19)) return 'Bélier';
  if ((mois === 4 && jour >= 20) || (mois === 5 && jour <= 20)) return 'Taureau';
  if ((mois === 5 && jour >= 21) || (mois === 6 && jour <= 20)) return 'Gémeaux';
  if ((mois === 6 && jour >= 21) || (mois === 7 && jour <= 22)) return 'Cancer';
  if ((mois === 7 && jour >= 23) || (mois === 8 && jour <= 22)) return 'Lion';
  if ((mois === 8 && jour >= 23) || (mois === 9 && jour <= 22)) return 'Vierge';
  if ((mois === 9 && jour >= 23) || (mois === 10 && jour <= 22)) return 'Balance';
  if ((mois === 10 && jour >= 23) || (mois === 11 && jour <= 21)) return 'Scorpion';
  if ((mois === 11 && jour >= 22) || (mois === 12 && jour <= 21)) return 'Sagittaire';
  if ((mois === 12 && jour >= 22) || (mois === 1 && jour <= 19)) return 'Capricorne';
  if ((mois === 1 && jour >= 20) || (mois === 2 && jour <= 18)) return 'Verseau';
  return 'Poissons';
}

export const EMPREINTE_COULEURS: Record<string, string[]> = {
  'soleil': ['#FFD700', '#FF8C00', '#FFA500'],
  'lune': ['#C0C0FF', '#8A2BE2', '#4B0082'],
  'etoile': ['#FFD700', '#87CEEB', '#E0E0FF'],
  'comete': ['#FF4500', '#FF6347', '#DC143C'],
};

export function getEmpreinteCouleur(energie: string): string {
  const map: Record<string, string> = {
    'Soleil ardent':    '#FFD700',
    'Lune mystérieuse': '#8A2BE2',
    'Étoile libre':     '#87CEEB',
    'Comète passionnée':'#FF4500',
  };
  return map[energie] ?? '#C084FC';
}

/** Couleur principale d'un signe astrologique */
export function getCouleurSigne(signe: string): string {
  return SIGNES_ASTRO[signe]?.couleur ?? '#C084FC';
}
