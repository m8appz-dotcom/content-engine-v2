#!/usr/bin/env bash
set -euo pipefail
ENV_NAME="${1:-staging}"
if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: $0 <staging|production>" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/data/$ENV_NAME" "$ROOT/outputs/$ENV_NAME" "$HOME/.config/systemd/user"
if [[ ! -f "$ROOT/deploy/env/$ENV_NAME.env" ]]; then
  cp "$ROOT/deploy/env/$ENV_NAME.env.example" "$ROOT/deploy/env/$ENV_NAME.env"
fi
npm run build
set -a
source "$ROOT/deploy/env/$ENV_NAME.env"
set +a
npm run migrate
cp "$ROOT/deploy/systemd/content-engine-v2@.service" "$HOME/.config/systemd/user/content-engine-v2@.service"
systemctl --user daemon-reload
systemctl --user enable --now "content-engine-v2@$ENV_NAME.service"
systemctl --user restart "content-engine-v2@$ENV_NAME.service"
echo "deployed content-engine-v2@$ENV_NAME on http://${HOSTNAME:-127.0.0.1}:${PORT}"
