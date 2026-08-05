#!/usr/bin/env bash
# ============================================================
# Aevyra — Déploiement Cloudflare Pages direct (Plan B)
# Usage : bash scripts/deploy-cloudflare.sh
# v597 — retry auto, chemins absolus, vérif HTTP post-deploy
# ============================================================
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${BLUE}${BOLD}$*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

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

# ── Valider les variables ────────────────────────────────────
[[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && fail "CLOUDFLARE_API_TOKEN manquant dans .env.deploy"
[[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]] && fail "CLOUDFLARE_ACCOUNT_ID manquant dans .env.deploy"
[[ -z "${CF_PAGES_PROJECT:-}" ]]      && fail "CF_PAGES_PROJECT manquant dans .env.deploy"
CF_BRANCH="${CF_BRANCH:-main}"
DEPLOY_RETRY="${DEPLOY_RETRY:-3}"
SITE_URL="${SITE_URL:-https://aevyra.uk}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🚀 Aevyra — Déploiement Cloudflare Pages  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Build Expo web ───────────────────────────────────────────
log "🔨 [1/4] Build Expo web → dist/ ..."
cd "$ROOT_DIR"
pnpm exec expo export --platform web --output-dir dist --clear || fail "Build Expo échoué"

for f in robots.txt sitemap.xml sw.js BingSiteAuth.xml google-site-verification.html; do
  [ -f "public/$f" ] && cp "public/$f" "dist/$f" && echo "   ✓ $f"
done
[ -f "scripts/inject-og.js" ] && node scripts/inject-og.js && ok "OG tags injectés"
ok "Build terminé — $(find dist -type f | wc -l | tr -d ' ') fichiers"

# ── Déploiement Wrangler avec retry ─────────────────────────
log "🌐 [2/4] Déploiement Cloudflare (retry max: $DEPLOY_RETRY) ..."
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
    [[ $attempt -lt $DEPLOY_RETRY ]] && warn "Tentative $attempt échouée — retry dans 5s..." && sleep 5
  fi
done
[ "$DEPLOY_OK" = "false" ] && fail "Déploiement échoué après $DEPLOY_RETRY tentatives"
ok "Déploiement Cloudflare réussi !"

# ── Vérification HTTP ────────────────────────────────────────
log "🔍 [3/4] Vérification $SITE_URL ..."
sleep 4
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE_URL" 2>/dev/null || echo "000")
[[ "$HTTP_CODE" =~ ^(200|301|302)$ ]] && ok "Site en ligne — HTTP $HTTP_CODE ✨" || warn "HTTP $HTTP_CODE — propagation en cours"

# ── Résumé ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   ✅ CLOUDFLARE DÉPLOYÉ — AEVYRA EN LIGNE !  ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo -e "   🌐 ${BOLD}$SITE_URL${NC}"
echo -e "   📦 ${BOLD}https://${CF_PAGES_PROJECT}.pages.dev${NC}"
echo ""
