# From project evidence to a reviewable video

A fluent script can make a claim its source does not support. Content Engine separates a candidate script, its evidence references and the decision to approve a revision. Editing a reviewed script invalidates that revision's approval.

[Open the original app](https://content.kennethyepez.com/app) · [Production workflow](ORIGINAL-APP.md) · [Current application screens](PRODUCT.md) · [Offline contract output](examples/pipeline-output.json)

## Responsibility and decisions

Kenneth Yepez directs product requirements, architecture, integration and acceptance. AI coding agents implement and test the code under his direction. These are project decisions, not a claim that Kenneth hand-coded every module.

| Decision demonstrated in the code | Reason and tradeoff |
| --- | --- |
| Validate structured output before persistence | Invalid artifacts stop at a contract boundary; schemas require maintenance. |
| Separate evidence mapping from editorial truth | A reference makes a claim inspectable; a valid evidence ID cannot establish its truth. |
| Bind approval to a script revision | An edit needs a new decision; reviewers repeat approval after a material change. |
| Isolate projects by authenticated account | Each account has private storage and protected media; production databases are not demonstration inputs. |
| Preserve the original application | Its Next.js routes, state machine and renderer remain the product; the earlier authored example stays available separately. |
| Render from the approved revision | The storyboard and video use the approved script; prior draft artifacts remain available. |

## Inspect an actual result

[Watch the finished 20-second film](https://kennethyepez.com/projects/content-engine#rendered-film). The native renderer made it from the project's public sources, reviewed English script and approved three-scene storyboard. The film pairs a real application capture with a literal architecture excerpt and the recorded editorial decisions. It preserves the previously accepted narration without new synthesis, music or effects.

The final artifact played from start to finish in the authenticated production workspace on November 22, 2026. An independent AI reviewer inspected every second and additional transition frames, finding no actionable visual defects. That inspection does not represent a new human visual approval or a fresh listening test. The holder's earlier listening acceptance applies to the unchanged audio recording.

## Reproduce the offline contracts

The native walkthrough was executed again in an isolated checkout. It produced three schema-valid story candidates, a script with mapped evidence and a rejected unsupported-claim negative control. The output contains the source and actual native artifacts.

```sh
npm ci
npm run demo
```

This offline run makes zero live provider calls. It demonstrates contracts and evidence references. It does not measure model quality, provider latency, savings or completed video production.

The retained [screen recording](examples/workspace-walkthrough.mp4) shows the earlier English authored-example workflow, with idle waits shortened and no narration. It does not record the current original app, a live provider response or completed human authentication.

## Delivery and remaining acceptance

[Engine PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/4) · [Maintenance PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/6). Checks and automated review discussion remain visible. Recovery refs and history remain intact; rollback uses a reviewed revert.

The isolated [HTTPS workspace](https://content.kennethyepez.com) is deployed with exact-domain passkeys and private durable state. [Hosting PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/8) records the implementation, CI and automated code/security review. The browser verifies that anonymous engine execution opens the passkey flow; it does not bypass it. The deployed native planner completed a private machine-identity check with three scenes and zero provider calls. Existing Spark production services and data remain separate.

The [original-app integration](https://github.com/m8appz-dotcom/content-engine-v2/pull/11) connects real model generation, English narration, the native renderer and protected MP4 playback. An isolated component run produced a schema-valid angle and script and a 26-second narrated video using public project sources. This component run did not create human approvals and is separate from browser acceptance.

The original app is deployed with the existing account and passkey store retained. On November 22, the holder signed in, approved a concrete English script and three-scene storyboard, and tested the resulting 20-second MP4. Listening exposed narration defects that file checks missed. After correction, the app rendered a new immutable draft, ran checks for that version and played the complete result; the holder confirmed the full audio. The [acceptance record](ORIGINAL-APP.md#acceptance-status) separates this workflow test from unmeasured provider benchmarks. No additional authenticator is required to demonstrate the product. No customer outcome or migration of an unrelated active service is claimed.
