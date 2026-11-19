# Content Engine v2 — Spec Compliance Guardrails

Canonical contract: `docs/production-agent-spec.md` (v2.1).

## Non-negotiable video rules implemented as product constraints

- Draft rendering uses Remotion composition first; ffmpeg is allowed only for encoding/contact-sheet/post-processing.
- A draft cannot render without readable `preview_assets` from real evidence.
- The first frame must show real evidence or a clear promise; no dark placeholder cards.
- Captions are burned in with mobile safe-area wrapping.
- Storyboard/production plan must describe human-visible composition, not just technical state.
- Tests must fail if the renderer falls back to `drawbox`/`drawtext` placeholder composition.

## Human success criterion

A non-technical business owner should understand, without logs or explanation:

1. what visual proof is being shown;
2. what was done with IA/tech;
3. why the method matters;
4. what business benefit the short is communicating.
