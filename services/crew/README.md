# Content Engine v2 CrewAI service

Production contract for CrewAI/GPT-5.5 structured-output agents.

- Model default: `gpt-5.5` via `CONTENT_ENGINE_GPT55_MODEL`.
- Preferred auth: direct Codex OAuth via `CONTENT_ENGINE_AI_MODE=codex_oauth` and `CONTENT_ENGINE_CODEX_OAUTH_CREDENTIALS_PATH` (or token env vars). No OpenClaw CLI/gateway/runtime is invoked.
- API-key OpenAI remains a fallback mode only when `CONTENT_ENGINE_AI_MODE` is not `codex_oauth`.
- All model responses must pass the shared Zod schemas before DB writes.
- Deterministic local artifacts remain the safe fallback when provider env is missing.

Agents:
1. Story Miner → `StoryAngleSchema`
2. Scriptwriter → `ScriptCandidateSchema`
3. Claim Verifier remains local deterministic gate.
