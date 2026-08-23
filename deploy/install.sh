#!/usr/bin/env bash
# Fresh-server bootstrap for all three LSPD bots (welcome, logs, tickets),
# all three running as one Discord bot identity under one shared token.
#
# Safe to re-run: every step checks state before changing it.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vzjRR/ENCLAVE-LSPD.git}"
APP_DIR="${APP_DIR:-/opt/lspd-bot}"
RUN_USER="${RUN_USER:-lspd-bot}"
ENV_FILE="${ENV_FILE:-/etc/lspd-bot.env}"
NODE_MAJOR="${NODE_MAJOR:-20}"

log() { echo -e "\n\033[1;35m▸ $*\033[0m"; }

log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
# The full Noto suite (not just fonts-noto-core) so any script in a Discord
# display name -- Cherokee, Georgian, Runic, color emoji, etc. -- renders as
# a real glyph instead of a tofu box. fontconfig picks these up automatically
# via lspd-welcome-bot's own fonts.conf, no code change needed per script.
apt-get install -y --no-install-recommends \
  ca-certificates curl git \
  fontconfig fonts-noto fonts-noto-cjk fonts-noto-extra fonts-noto-color-emoji

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  log "Installing Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if ! id -u "$RUN_USER" >/dev/null 2>&1; then
  log "Creating run user $RUN_USER"
  useradd --system --create-home --shell /usr/sbin/nologin "$RUN_USER"
fi

git config --global --add safe.directory "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  log "Updating existing checkout"
  git -C "$APP_DIR" fetch origin main --quiet
  git -C "$APP_DIR" reset --hard origin/main --quiet
else
  log "Cloning $REPO_URL"
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR" --quiet
fi
chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"

log "Writing $ENV_FILE (only if missing -- never overwrites secrets)"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
DISCORD_TOKEN=
GUILD_ID=

# Tickets bot
CLIENT_ID=
PANEL_CHANNEL_ID=
ENABLE_GUILD_MEMBERS=true
ENABLE_MESSAGE_CONTENT=true

# logs-bot: route every enabled log type to one channel by id instead of
# one channel per type by name, and/or turn specific types off. Both
# optional -- see logs-bot/.env.example.
LOG_CHANNEL_ID=
LOG_DISABLE_TYPES=
EOF
  chmod 600 "$ENV_FILE"
  chown root:root "$ENV_FILE"
  log "Created $ENV_FILE -- fill it in before starting the services"
else
  log "$ENV_FILE already exists -- left untouched"
fi

log "Installing dependencies"
runuser -u "$RUN_USER" -- bash -c "cd '$APP_DIR/lspd-welcome-bot' && npm install --omit=dev --no-audit --no-fund"
runuser -u "$RUN_USER" -- bash -c "cd '$APP_DIR/logs-bot' && npm install --omit=dev --no-audit --no-fund"
runuser -u "$RUN_USER" -- bash -c "cd '$APP_DIR/tickets-bot' && npm ci --omit=dev"
mkdir -p "$APP_DIR/tickets-bot/data"
chown -R "$RUN_USER:$RUN_USER" "$APP_DIR/tickets-bot/data"

log "Installing systemd units"
cp "$APP_DIR/deploy/lspd-bot.service" /etc/systemd/system/
cp "$APP_DIR/deploy/lspd-logs-bot.service" /etc/systemd/system/
cp "$APP_DIR/deploy/lspd-tickets-bot.service" /etc/systemd/system/
systemctl daemon-reload

log "Done"
cat <<DONE
  1. Fill in the secrets:      nano $ENV_FILE
  2. Register ticket commands (one-time, and again after a command change):
       set -a; source $ENV_FILE; set +a
       cd $APP_DIR/tickets-bot && npm run deploy
  3. Start everything:
       systemctl enable --now lspd-bot lspd-logs-bot lspd-tickets-bot
       systemctl status lspd-bot lspd-logs-bot lspd-tickets-bot --no-pager
  4. In Discord: run /quick-setup in the LSPD server (needs Manage Server).
DONE
