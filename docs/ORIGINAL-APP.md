# Original production app

The primary workspace connects the repository's Next.js application and production packages to the selected editorial design: a serif project rail, paper background and side-by-side source and script columns. Sources include an accessible process illustration and a protected original application capture. The earlier authored example interface remains available under `/workspace/`, with its existing saved copies and WebAuthn account store retained.

## Try the workflow

1. Open the HTTPS workspace at `/app` and sign in with your passkey. Initial private registration requires an administrator invitation.
2. Create a project and choose **Open prepared sources**. This reads only the public architecture document and an actual capture of the original app.
3. Generate a story angle, choose it and read the generated script alongside its evidence.
4. Review and approve that script revision, then build and review its storyboard.
5. Approve the storyboard and render the video. Watch the actual MP4, then run its checks. A failed check shows its reasons; it does not authorize publishing.

Approvals belong to the authenticated account. The app does not impersonate a reviewer, approve revisions automatically, or publish content. A provider failure stops that step rather than substituting a canned AI response.

## Isolated hosting

Install both dependency locks, then build from the repository root with `CONTENT_ORIGINAL_WORKSPACE=1 npm run build`. Keep the existing HTTPS origin, RP ID, invitations and private `WORKSPACE_STATE`. Set `NODE_ENV=production` and `CONTENT_ORIGINAL_WORKSPACE=1` in the dedicated runtime environment; the existing `node demo/hosted-server.mjs` entry point selects the original app. `npm start` also uses the guarded original-app server. A hosted origin refuses development mode.

The gateway and Next handler share one loopback listener. Every original API action requires a real passkey session. Each account has a separate SQLite database and output directory beneath private state; media requests require membership in that account's project and draft. No second unguarded Next server should run beside it.

For the approved private model/voice integration, set `CONTENT_ENGINE_APP_GENERATION=provider` and `CONTENT_ENGINE_AI_MODE=spark_private`. The server may read `CONTENT_ENGINE_PRIVATE_VOICE_CONFIG`, an administrator-controlled file outside the checkout. It imports only model/voice endpoints, model name and scoped tokens; it never imports another app's origin, state, port or account configuration. None of those private values goes to the browser or this repository.

The first narration uses the approved script's scene lines through the existing private English voice service. Sentence requests preserve the returned audio and use a speech-only pronunciation cue for the product name; the approved script and captions remain intact. A visual rerender reuses the compatible earlier draft's AAC packets without synthesizing, mixing or re-encoding the voice. A missing or incompatible earlier recording blocks the rerender. Narrated video uses voice alone at 48 kHz. Video duration follows the complete voice track. Drafts and their media URLs retain prior versions.

**Render new version** keeps the approved script and storyboard and creates another draft. Its visual plan binds scenes to that project's real public evidence. An explicit source selection remains available on subsequent versions of the same approved storyboard; it never becomes a global preset. The derived visual revision records its source IDs and the original approvals, without creating a new human approval. It remains pending visual review. Checks apply to the latest rendered version; requesting QA for an older draft cannot mark the new one as checked. Passing file checks is separate from listening to the narration and inspecting the full video.

The dedicated service needs a finite rendering budget: 2 GiB memory, two CPU cores and 256 tasks are the supplied ceiling. It can write only its private state and private temporary directory. Build the renderer browser before switching the immutable release; keep the old release, configuration and state backup for rollback. Other services and databases are outside this deployment's scope.

## Acceptance status

On November 22, 2026, the holder signed in with an existing passkey. The connected application generated an English angle and script from the prepared public sources. The holder approved a concrete script revision and its three-scene storyboard; those decisions were then recorded through the authenticated application. The native renderer produced a 20-second portrait MP4, and the browser player reached its end without a playback error.

The holder rejected the initial narration despite passing file checks. The audio correction removes added tones, splits speech into sentences and uses a pronunciation cue checked with the holder. The corrected video was rendered again through the authenticated application, checked as a new draft and played to its end. The holder then listened to the complete file and confirmed clean, complete narration and the corrected pronunciation. The final MP4 uses H.264 at 1080 × 1920 with mono AAC at 48 kHz. This is workflow acceptance, not a provider quality or latency benchmark.

The holder accepted that recording's audio and subsequently rejected its visual quality. That listening acceptance does not approve the original visual composition or any later cut. Automated quality fields now remain unscored, with perceptual review explicitly pending. The retained authored walkthrough is historical evidence, separate from this connected production journey. No extra authenticator is needed for the existing account, and no customer outcome or unrelated production-service migration is claimed.

The corrected editorial film is now available on the [public project page](https://kennethyepez.com/projects/content-engine#rendered-film). It uses a readable original application capture, a literal source excerpt and separately labelled review phases. The renderer preserved the approved audio: encoded AAC payloads and decoded PCM match the accepted recording, with no new synthesis or added sound. An independent AI reviewer inspected 36 frames across the full duration and transition boundaries and found no actionable visual defects; this was a frame-based review, not a new listening acceptance. After the holder signed in with the existing passkey, the final video played continuously from 0 to 19.985 seconds at normal speed in the actual workspace, unmuted and without a player error. Refreshing the project retained that draft and its file checks. These checks do not create a human visual approval or rate the design.
