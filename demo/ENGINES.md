# Repository engine connection

**Create storyboard**

Calls the actual ScriptCandidate/Evidence schemas, claim-reference verifier, production planner and storyboard builder. The current English draft becomes the timed storyboard. This is deterministic planning; it does not make a model call, certify factual accuracy, approve a draft or render a finished video.

## Setup

Install the repository root dependencies with `npm ci`, then install this demo with `cd demo && npm ci`. The adapter uses the root `tsx` runtime. No database, source registry or production output directory is opened.

Run the demo with `npm start` from this directory and open its documented localhost origin. The static directory is `public`; configuration, adapters and private run folders are never served as static files.

## Access and outputs

The existing FIDO2/WebAuthn workspace flow remains in place. Real holder registration, sign-in and second-key recovery still require holder interaction. Live provider actions require a verified session. There is no demo authentication bypass.

Machine-only acceptance can use an explicitly configured DEMO_SERVICE_TOKEN of at least 32 random bytes. Keep it in a private server environment and never in browser code or URLs. It represents a service identity, not a human passkey test. No token is included in this repository.

Each engine task writes only beneath its own ignored `.demo-state/engine/<run>` directory. Download links require the same browser ownership cookie (or the configured service identity). Jobs expire after one hour in memory; disk files are retained locally for recovery and are not automatically deleted. No production database or existing service is changed. Stop this local demo normally when finished.

The gateway rejects foreign origins, unknown actions, oversized input, cross-session artifact access and outputs outside the job directory. Raw provider errors stay in private run logs. It never accepts an arbitrary remote URL or a filesystem path from the browser.

## Acceptance

The adapter is exercised separately from its browser journey; see VERIFY.md. `npm test` includes origin, access, job ownership and error-isolation checks. Physical passkey and live-provider limits are stated explicitly. Preserve `.demo-state` before removing or replacing this isolated demo if its outputs matter.
