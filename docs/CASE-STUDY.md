# From a source document to a reviewable storyboard

A fluent script can make a claim its source does not support. Content Engine separates a candidate script, its evidence references and the decision to approve a revision. Editing a reviewed script invalidates that revision's approval.

[Current screens](PRODUCT.md) · [Workspace recording](examples/workspace-walkthrough.mp4) · [Native output](examples/pipeline-output.json)

## Responsibility and decisions

Kenneth Yepez directs product requirements, architecture, integration and acceptance. AI coding agents implement and test the code under his direction. These are project decisions, not a claim that Kenneth hand-coded every module.

| Decision demonstrated in the code | Reason and tradeoff |
| --- | --- |
| Validate structured output before persistence | Invalid artifacts stop at a contract boundary; schemas require maintenance. |
| Separate evidence mapping from editorial truth | A reference makes a claim inspectable; a valid evidence ID cannot establish its truth. |
| Bind approval to a script revision | An edit needs a new decision; reviewers repeat approval after a material change. |
| Isolate demonstration state | Planning can run without opening a production database; this does not prove deployment. |

## Inspect an actual result

The native walkthrough was executed again in an isolated checkout. It produced three schema-valid story candidates, a script with mapped evidence and a rejected unsupported-claim negative control. The output contains the source and actual native artifacts.

```sh
npm ci
npm run demo
```

This offline run makes zero live provider calls. It demonstrates contracts and evidence references. It does not measure model quality, provider latency, savings or completed video production.

The screen recording shows the English authored-example workflow, with idle waits shortened and no narration. It does not simulate human approval or a live response. [Engine setup](../demo/ENGINES.md) explains the connected native planner.

## Delivery and remaining acceptance

[Engine PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/4) · [Maintenance PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/6). Checks and automated review discussion remain visible. Recovery refs and history remain intact; rollback uses a reviewed revert.

The isolated [HTTPS workspace](https://content.kennethyepez.com) is deployed with exact-domain passkeys and private durable state. [Hosting PR](https://github.com/m8appz-dotcom/content-engine-v2/pull/8) records the implementation, CI and automated code/security review. The browser verifies that anonymous engine execution opens the passkey flow; it does not bypass it. The deployed native planner completed a private machine-identity check with three scenes and zero provider calls. Existing Spark production services and data remain separate.

A current-revision real-provider run with reviewed outputs is still needed to establish generation quality. Holder registration, sign-in and second-passkey recovery remain physical acceptance steps. A machine service identity does not complete those steps. No customer outcome or migration of an active production service is claimed.
