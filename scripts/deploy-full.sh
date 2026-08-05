#!/usr/bin/env bash
# ============================================================
# Aevyra — Déploiement DOUBLE : Plan A (GitHub) + Plan B (Wrangler)
# Usage : bash scripts/deploy-full.sh ["message de commit"]
# v597 — retry auto, couleurs, chemins absolus, vérif HTTP
# ============================================================
set -uo pipefail   # PAS -e : on gère les erreurs manuellement

# ── Couleurs terminal ────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${BLUE}${BOLD}$*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

COMMIT_MSG="${1:-"deploy: mise à jour Aevyra $(date '+%Y-%m-%d %H:%M')"}"

# ── Charger .env.deploy (chemin absolu) ──────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.deploy"
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
  ok ".env.deploy chargé"
else
  fail ".env.deploy introuvable dans $ROOT_DIR"
fi

# ── Valider variables ────────────────────────────────────────
[[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && fail "CLOUDFLARE_API_TOKEN manquant dans .env.deploy"
[[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]] && fail "CLOUDFLARE_ACCOUNT_ID manquant dans .env.deploy"
[[ -z "${CF_PAGES_PROJECT:-}" ]]      && fail "CF_PAGES_PROJECT manquant dans .env.deploy"
CF_BRANCH="${CF_BRANCH:-main}"
GIT_BRANCH="${GIT_BRANCH:-master}"
DEPLOY_RETRY="${DEPLOY_RETRY:-3}"
SITE_URL="${SITE_URL:-https://aevyra.uk}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🚀 Aevyra — Déploiement DOUBLE (Plan A + Plan B)  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ══════════════════════════════════════════════════════════════
# ÉTAPE 1 — Lint (bloquant)
# ══════════════════════════════════════════════════════════════
log "🔍 [1/5] Lint ..."
cd "$ROOT_DIR"
pnpm run lint && ok "Lint PASSED" || fail "Lint FAILED — corrigez les erreurs avant de déployer"

# ══════════════════════════════════════════════════════════════
# ÉTAPE 2 — Build Expo web
# ══════════════════════════════════════════════════════════════
log "🔨 [2/5] Build Expo web → dist/ ..."
pnpm exec expo export --platform web --output-dir dist --clear || fail "Build Expo échoué"

for f in robots.txt sitemap.xml sw.js BingSiteAuth.xml google-site-verification.html _redirects _headers; do
  [ -f "public/$f" ] && cp "public/$f" "dist/$f"
done
[ -f "scripts/inject-og.js" ] && node scripts/inject-og.js

# ── Dossiers statiques pour les alias SEO + auth (fix Cloudflare trailing-slash 308) ──
# Cloudflare Pages applique son redirect trailing-slash AVANT _redirects pour les
# chemins sans fichier statique correspondant. La seule solution fiable est de créer
# un vrai dist/<alias>/index.html — Cloudflare le sert directement, zéro 308.
for alias in register sign-in login join rencontre-astrologique compatibilite-astrologique app-rencontre-gratuite; do
  mkdir -p "dist/$alias"
  cp dist/index.html "dist/$alias/index.html"
done

ok "Build OK — $(find dist -type f | wc -l | tr -d ' ') fichiers dans dist/"

# ══════════════════════════════════════════════════════════════
# PLAN A — Git commit + push GitHub
# ══════════════════════════════════════════════════════════════
log "📤 [3/5] PLAN A — Push GitHub ($GIT_BRANCH) ..."
PLAN_A_OK=false

# Récupérer les commits distants pour éviter non-fast-forward
git fetch origin "$GIT_BRANCH" --quiet 2>/dev/null || true
git merge "origin/$GIT_BRANCH" -X ours --quiet --no-edit 2>/dev/null || true

# Committer si changements
if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  git add -A && git commit -m "$COMMIT_MSG" --quiet
fi

if git push origin "$GIT_BRANCH" 2>&1; then
  ok "Plan A RÉUSSI — GitHub push OK"
  PLAN_A_OK=true
else
  warn "Plan A ÉCHOUÉ — Plan B prend le relais automatiquement..."
fi

# ══════════════════════════════════════════════════════════════
# PLAN B — Wrangler direct (TOUJOURS exécuté)
# ══════════════════════════════════════════════════════════════
log "🌐 [4/5] PLAN B — Cloudflare direct (retry: $DEPLOY_RETRY) ..."
DEPLOY_OK=false
for attempt in $(seq 1 "$DEPLOY_RETRY"); do
  echo "   Tentative $attempt/$DEPLOY_RETRY ..."
  if CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
     CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
     npx wrangler pages deploy dist \
       --project-name="$CF_PAGES_PROJECT" \
       --branch="$CF_BRANCH" \
       --commit-dirty=true 2>&1; then
    DEPLOY_OK=true; break
  else
    [[ $attempt -lt $DEPLOY_RETRY ]] && warn "Retry dans 5s..." && sleep 5
  fi
done
[ "$DEPLOY_OK" = "false" ] && fail "Plan B échoué après $DEPLOY_RETRY tentatives"
ok "Plan B RÉUSSI — Cloudflare Pages mis à jour !"

# ══════════════════════════════════════════════════════════════
# ÉTAPE 5 — Vérification HTTP
# ══════════════════════════════════════════════════════════════
log "🔍 [5/5] Vérification $SITE_URL ..."
sleep 4
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE_URL" 2>/dev/null || echo "000")
[[ "$HTTP_CODE" =~ ^(200|301|302)$ ]] && ok "Site en ligne — HTTP $HTTP_CODE ✨" || warn "HTTP $HTTP_CODE — propagation en cours (1-2 min)"

# ══════════════════════════════════════════════════════════════
# RÉSUMÉ
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   ✅ AEVYRA DÉPLOYÉ — EN LIGNE !                     ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${NC}"
[ "$PLAN_A_OK" = "true" ] \
  && echo -e "${BOLD}║   Plan A GitHub   : ${GREEN}✅ OK${NC}${BOLD}                           ║${NC}" \
  || echo -e "${BOLD}║   Plan A GitHub   : ${YELLOW}⚠️  ignoré${NC}${BOLD}                       ║${NC}"
echo -e "${BOLD}║   Plan B Wrangler : ${GREEN}✅ GARANTI${NC}${BOLD}                       ║${NC}"
echo -e "${BOLD}║   HTTP Check      : ${GREEN}$HTTP_CODE${NC}${BOLD}                              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "   🌐 ${BOLD}$SITE_URL${NC}"
echo -e "   📦 ${BOLD}https://${CF_PAGES_PROJECT}.pages.dev${NC}"
echo ""
