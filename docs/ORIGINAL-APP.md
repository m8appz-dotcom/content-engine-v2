# Original production app

The primary workspace connects the repository's Next.js application and production packages to the selected editorial design: a serif project rail, paper background and side-by-side source and script columns. Sources include an accessible process illustration and a protected original application capture. The earlier authored example interface remains available under `/workspace/`, with its existing saved copies and WebAuthn account store retained.

## Try the workflow

1. Open the HTTPS workspace at `/app` and sign in with your passkey. Initial private registration requires an administrator invitation.
2. Create a project and choose **Use public project sources**. This reads only the public architecture document and an actual capture of the original app.
3. Generate a story angle, choose it and read the generated script alongside its evidence.
4. Review and approve that script revision, then build and review its storyboard.
5. Approve the storyboard and render the video. Watch the actual MP4, then run its checks. A failed check shows its reasons; it does not authorize publishing.

Approvals belong to the authenticated account. The app does not impersonate a reviewer, approve revisions automatically, or publish content. A provider failure stops that step rather than substituting a canned AI response.

## Isolated hosting

Install both dependency locks, then build from the repository root with `CONTENT_ORIGINAL_WORKSPACE=1 npm run build`. Keep the existing HTTPS origin, RP ID, invitations and private `WORKSPACE_STATE`. Set `NODE_ENV=production` and `CONTENT_ORIGINAL_WORKSPACE=1` in the dedicated runtime environment; the existing `node demo/hosted-server.mjs` entry point selects the original app. `npm start` also uses the guarded original-app server. A hosted origin refuses development mode.

The gateway and Next handler share one loopback listener. Every original API action requires a real passkey session. Each account has a separate SQLite database and output directory beneath private state; media requests require membership in that account's project and draft. No second unguarded Next server should run beside it.

For the approved private model/voice integration, set `CONTENT_ENGINE_APP_GENERATION=provider` and `CONTENT_ENGINE_AI_MODE=spark_private`. The server may read `CONTENT_ENGINE_PRIVATE_VOICE_CONFIG`, an administrator-controlled file outside the checkout. It imports only model/voice endpoints, model name and scoped tokens; it never imports another app's origin, state, port or account configuration. None of those private values goes to the browser or this repository.

Narration uses the approved script's scene lines through the existing private English voice service. The resulting WAV is unique to the draft. Video duration follows the complete voice track; it is not cut to a fixed thirty seconds. Drafts and their media URLs retain prior versions.

The dedicated service needs a finite rendering budget: 2 GiB memory, two CPU cores and 256 tasks are the supplied ceiling. It can write only its private state and private temporary directory. Build the renderer browser before switching the immutable release; keep the old release, configuration and state backup for rollback. Other services and databases are outside this deployment's scope.

## Acceptance status

The original app shell, strict gateway routing, bounded requests, private artifact responses and structured output constraints have automated checks. A real private model produced a schema-valid angle and script in an isolated service preflight. That preflight used public repository sources and did not create or claim human approvals.

Final browser acceptance requires the holder's actual sign-in, script/storyboard review, full rendered result and desktop/mobile inspection. Until that is recorded, the retained authored walkthrough is historical evidence and must not be presented as the completed production journey.
