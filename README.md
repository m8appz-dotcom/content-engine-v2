# Content Engine v2

Evidence-first short-form content engine for M8 Apps.

Core chain:

```txt
evidencia real → ángulos fuertes → guiones verificables → aprobación humana → storyboard → draft → QA
```

## MVP guardrails

- No v1/Bobi architecture or workflow copying.
- No public claims without evidence mapping.
- No final/export/publish without explicit approval and QA pass.
- No Tier 2/3 providers before Tier 0/1 is proven.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run migrate
npm run smoke
npm run build
```


## Current implemented API surface

- `GET /api/health`
- `GET /api/providers/status`
- `POST /api/jobs`, `GET /api/jobs`, `GET/PATCH /api/jobs/:id`
- `POST/GET /api/jobs/:id/evidence`
- `POST /api/jobs/:id/collect-evidence`
- `POST/GET /api/jobs/:id/story-angles`
- `POST /api/jobs/:id/select-angle`
- `POST/GET /api/jobs/:id/scripts`
- `POST /api/jobs/:id/verify-claims`
- `POST /api/jobs/:id/approve-script`, `POST /api/jobs/:id/request-script-revision`, `POST /api/jobs/:id/reject-script`
- `POST/GET /api/jobs/:id/production-plan`
- `POST /api/jobs/:id/storyboard-preview`, `GET /api/jobs/:id/storyboard`
- `POST /api/jobs/:id/approve-storyboard`, `POST /api/jobs/:id/request-storyboard-revision`
- `POST /api/jobs/:id/render-draft`, `GET /api/jobs/:id/drafts`, `GET /api/jobs/:id/drafts/:draftId`
- `POST/GET /api/jobs/:id/qa`
- `POST /api/jobs/:id/approve-publish`
- `POST /api/jobs/:id/export-final`, `POST /api/jobs/:id/publish` intentionally blocked in MVP slice
- `GET /api/jobs/:id/audit-log`

Story angles require at least one public-safe visual evidence item with owned/licensed/generated/authorized rights.

Gate A approval requires valid script schema, claim-evidence mappings, no unsupported claims, no prohibited public language, and explicit owner understanding of the angle/benefit.

Storyboard preview is evidence-first and preview-only; final render/export remains blocked until later QA slices.

Draft MVP writes structured preview/contact-sheet/timeline JSON artifacts under `outputs/drafts/{job_id}`. QA Gate B can pass but publish requires explicit approval and export/publish remain blocked until their own slice.
