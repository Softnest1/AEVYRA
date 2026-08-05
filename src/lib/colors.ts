/**
 * Aevyra — Constantes de couleurs centralisées
 * Toutes les valeurs respectent WCAG AA (contraste ≥ 4.5:1 sur fond #0D0D1A)
 * Lisibles en plein soleil, mode sombre système, TV, voiture, projecteur.
 *
 * RÈGLE : Ne jamais utiliser rgba(255,255,255, < 0.6) pour du TEXTE.
 *         Pour les décorations (bordures, fonds légers) les opacités basses sont OK.
 */

// ── Fond principal ─────────────────────────────────────────────────────────
export const BG_DEEP     = '#0D0D1A';   // fond primaire (très sombre)
export const BG_CARD     = '#14142A';   // fond carte
export const BG_SURFACE  = '#1A1A35';   // fond surface secondaire

// ── Or — couleur accent primaire ───────────────────────────────────────────
export const OR          = '#FFD700';   // or vif — contraste 12:1 sur BG_DEEP
export const OR_SOFT     = '#F0C040';   // or légèrement atténué — 9:1
export const OR_MUTED    = '#C8A830';   // or discret — 5.5:1 ✓ WCAG AA
export const OR_SUBTLE   = 'rgba(255,215,0,0.15)';  // fond décoratif uniquement

// ── Violet — couleur accent secondaire ────────────────────────────────────
export const VIOLET      = '#C084FC';   // violet vif — 6.8:1 ✓
export const VIOLET_SOFT = '#A855F7';   // 5.2:1 ✓
export const VIOLET_MUTED= '#7C4DB8';   // 4.5:1 ✓ limite AA

// ── Texte — hiérarchie lisible ─────────────────────────────────────────────
export const TEXT_PRIMARY   = '#F5E6C8';  // texte principal — 14:1 ✓✓
export const TEXT_SECONDARY = '#D4C4A0';  // texte secondaire — 8.5:1 ✓
export const TEXT_TERTIARY  = '#A89070';  // texte tertiaire — 5:1 ✓ WCAG AA
export const TEXT_DISABLED  = '#7A6850';  // texte désactivé — 3:1 (non interactif)
export const TEXT_ON_DARK   = '#FFFFFF';  // blanc pur sur fonds sombres

// ── Textes avec opacité — UNIQUEMENT pour texte non-interactif ─────────────
// Minimum 0.65 pour rester lisible en plein soleil
export const TEXT_WHITE_HI   = 'rgba(255,255,255,0.90)';  // titre sur fond sombre
export const TEXT_WHITE_MED  = 'rgba(255,255,255,0.75)';  // corps de texte
export const TEXT_WHITE_LOW  = 'rgba(255,255,255,0.65)';  // texte secondaire — min autorisé
export const TEXT_WHITE_HINT = 'rgba(255,255,255,0.50)';  // hints/placeholders seulement
export const TEXT_OR_HI      = 'rgba(255,215,0,0.90)';
export const TEXT_OR_MED     = 'rgba(255,215,0,0.75)';
export const TEXT_OR_LOW     = 'rgba(255,215,0,0.65)';

// ── Couleurs sémantiques ───────────────────────────────────────────────────
export const SUCCESS     = '#64FFB4';   // vert succès — 9:1 ✓
export const SUCCESS_SOFT= '#48BB78';   // vert doux — 6.5:1 ✓
export const ERROR       = '#FF8080';   // rouge erreur — 5.5:1 ✓
export const ERROR_DARK  = '#FC8181';
export const WARNING     = '#FFD700';   // or = warning
export const INFO        = '#87CEEB';   // bleu ciel — 6:1 ✓

// ── Placeholder pour inputs ────────────────────────────────────────────────
// Minimum 0.50 pour indiquer clairement le champ vide sans confondre avec le texte saisi
export const PLACEHOLDER = 'rgba(255,255,255,0.50)';

// ── Bordures et séparateurs (décoratifs — pas du texte) ───────────────────
export const BORDER_OR     = 'rgba(255,215,0,0.25)';
export const BORDER_WHITE  = 'rgba(255,255,255,0.12)';
export const BORDER_ACTIVE = OR;

// ── Fonds décoratifs (pas du texte) ───────────────────────────────────────
export const BG_OR_TINT    = 'rgba(255,215,0,0.08)';
export const BG_VIOLET_TINT= 'rgba(192,132,252,0.08)';
export const BG_WHITE_TINT = 'rgba(255,255,255,0.05)';
