#!/usr/bin/env bash
set -euo pipefail
ENV_NAME="${1:-staging}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/env/$ENV_NAME.env"
if [[ ! -f "$ENV_FILE" ]]; then echo "missing $ENV_FILE" >&2; exit 2; fi
set -a; source "$ENV_FILE"; set +a
BASE="http://${HOSTNAME:-127.0.0.1}:${PORT}"
for i in $(seq 1 60); do
  if curl -fsS "$BASE/api/health" >/tmp/content-engine-v2-health-$ENV_NAME.json; then break; fi
  sleep 1
done
curl -fsS "$BASE/api/providers/status" >/tmp/content-engine-v2-providers-$ENV_NAME.json
KEY="deploy-smoke-$ENV_NAME-$(date +%s)"
PAYLOAD=$(node -e "console.log(JSON.stringify({title:\"Deploy smoke $ENV_NAME\",description:\"Runtime smoke for deployed service\"}))")
RESP=$(curl -fsS -X POST "$BASE/api/jobs" -H 'content-type: application/json' -H "Idempotency-Key: $KEY" -d "$PAYLOAD")
JOB_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.job.id)" "$RESP")
curl -fsS "$BASE/api/jobs/$JOB_ID/task-runs" >/tmp/content-engine-v2-task-runs-$ENV_NAME.json
node - <<NODE
const fs=require('fs');
const health=JSON.parse(fs.readFileSync('/tmp/content-engine-v2-health-$ENV_NAME.json','utf8'));
const providers=JSON.parse(fs.readFileSync('/tmp/content-engine-v2-providers-$ENV_NAME.json','utf8'));
const tasks=JSON.parse(fs.readFileSync('/tmp/content-engine-v2-task-runs-$ENV_NAME.json','utf8'));
console.log(JSON.stringify({ok:true,env:'$ENV_NAME',base:'$BASE',health,provider_keys:Object.keys(providers.providers||{}),job_id:'$JOB_ID',task_runs:tasks.task_runs.length},null,2));
NODE
