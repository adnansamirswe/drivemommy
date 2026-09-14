#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  MergeDrive — Setup"
echo "  =================="
echo ""

# ── Check dependencies ──────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "Error: docker is not installed."
  echo "Install it: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "Error: docker compose is not available."
  exit 1
fi

# ── Gather inputs ───────────────────────────────────────
read -p "Domain (e.g. mergedrive.example.com): " DOMAIN
read -p "Port for web UI [3000]: " WEB_PORT
WEB_PORT=${WEB_PORT:-3000}

echo ""
echo "Generating secrets..."

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64)
ENC_KEY=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 32)

# ── Write .env ──────────────────────────────────────────
cat > .env << EOF
# ── Domain ──────────────────────────────────────────────
DOMAIN=${DOMAIN}

# ── Database ────────────────────────────────────────────
POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 32)

# ── API ─────────────────────────────────────────────────
JWT_ACCESS_SECRET=${JWT_SECRET}
TOKEN_ENCRYPTION_KEY=${ENC_KEY}
FRONTEND_URL=https://${DOMAIN}
GOOGLE_REDIRECT_URI=https://${DOMAIN}/api/connected-accounts/google/callback

# ── Web ─────────────────────────────────────────────────
WEB_PORT=${WEB_PORT}
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF

echo ".env created."

# ── Start ───────────────────────────────────────────────
echo ""
echo "Building and starting services..."
docker compose up -d --build

echo ""
echo "  Done!"
echo ""
echo "  Dashboard:  https://${DOMAIN}"
echo "  API:        https://${DOMAIN}/api"
echo ""
echo "  Next steps:"
echo "  1. Point your DNS to this server's IP"
echo "  2. Set up a reverse proxy (Nginx/Caddy) for HTTPS"
echo "  3. Open the dashboard and configure Google OAuth in Settings"
echo ""
