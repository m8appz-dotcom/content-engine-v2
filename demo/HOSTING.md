# Hosted workspace

The hosted entry point is separate from the localhost launcher. Set the exact HTTPS `WORKSPACE_ORIGIN`, an absolute `WORKSPACE_STATE` outside the checkout, and a dedicated `PORT`, then run `node demo/hosted-server.mjs` from the repository root. Install the root and demo dependency locks first. Never put environment files, tokens or state inside `public/` or Git.

The process binds only to loopback behind a dedicated HTTPS tunnel. It validates the configured Host and Origin and uses the exact hostname as its WebAuthn RP ID. Redirect aliases need their own deployment decision; request headers never choose an RP ID. Capture routes are disabled. All engine actions require a passkey session or the existing private service identity. A service identity is not evidence of human authentication.

Public visitors may inspect and edit the authored examples locally. Creating a server workspace registers a discoverable passkey with user verification. The server stores only public credential material and private workspace copies; no PIN, biometric or private authenticator key is collected. Browser drafts are not encrypted storage: use public examples and avoid confidential information.

## Data and limits

Private state is stored with owner-only permissions outside the immutable release. Workspaces and engine outputs persist on disk for recovery; the service does not silently delete them. Sessions and pending challenges expire in memory and are invalidated by restart. Task discovery expires after one hour, so export completed work promptly. Register a second passkey and export the browser workspace before relying on server storage. Contact the administrator to remove a saved workspace; this initial portfolio release has no self-service account deletion.

The hosted server limits registrations to 16 private accounts and 64 public credentials (four per account), active sessions to 1,024, pending challenges to 512, and saved task directories to 300. Existing access remains available when registration capacity is full. The gateway retains its two-task concurrency, 12 accepted tasks per owner per minute, bounded payloads and private artifact ownership. Reaching storage capacity blocks new tasks and preserves previous files. The service unit bounds CPU, memory and tasks; no model is loaded by the Content planner.


Each admitted account retains a reserved 256 KiB and 6,000 JSON nodes across its five supported private workspace slots; a slot may use at most 192 KiB. Another account cannot consume that reservation. Private registration has 16 finite slots; when full, the administrator must review capacity before admitting more users. Public authored examples remain available without registering. Credential metadata and pre-read store sizes are bounded; invalid/orphaned historical stores are preserved for offline recovery rather than truncated.

## Isolated deployment and rollback

`deploy/portfolio/content-workspace.service` supervises only this new workspace. Keep the release under a dedicated application directory, runtime configuration under its private configuration directory and persistent state under its private state directory. The service writes only to that state directory and its private temporary directory. Existing services, source checkouts and production databases are outside the write allowlist.

Upgrades must use the gated release switcher below. Do not update the running checkout in place or directly switch the symlink and restart: parent releases could produce valid original stores above the current 8 MiB guard. Those stores need backed offline migration while their previous release remains available.

Install the locked root/demo dependencies in a new immutable Git release under `~/apps/portfolio-content/releases/`, verify its tests and exact Git SHA, then run from that candidate:

```sh
node demo/deploy-release.mjs "$HOME/apps/portfolio-content" "$HOME/apps/portfolio-content/releases/<revision>" "$HOME/.local/state/portfolio-content/workspaces.json" <40-character-Git-SHA>
```

This is the required deployment path for `content-workspace.service`, with its checked-in unit and private `~/.config/portfolio-content/runtime.env`. It verifies the source/runtime pins, loads and serializes the entire candidate store in a separate process, and checks its peak RSS against 80% of the unit's finite `MemoryMax`. A migration failure exits before changing the current pointer or stopping/restarting the service. Keep the original store and release; perform any required migration separately with backups and explicit acceptance.

After a successful live preflight, the command briefly stops only this dedicated unit and repeats preflight against its final store, preventing concurrent saves from invalidating the first check. It privately backs up the environment and store, atomically switches `current`, restarts this unit and checks its passkey readiness endpoint. Failed readiness restores the previous release; the live store is never reset, restored over, or deleted. The deployment lock serializes this command; all operators must use it and leave its candidate/environment unchanged during deployment. A stale lock after a killed deploy requires operator inspection before removal.

First installation has no previous release to switch back to and requires separate acceptance before opening public routing. Stop only the new unit and remove only its new routing if first-install rollback is necessary; retain source and private state.

## Acceptance

Run `npm run check` in `demo`. The hosted regression exercises exact-host/origin rejection, correct RP ID, invalid credential rejection, consumed challenges, protected engine access, actual repository storyboard execution through an identified test service identity, artifact ownership and storage-capacity rejection. These tests do not register a holder's real authenticator.

Verify the public HTTPS page, responsive controls, security headers and negative access behavior through the real browser. The holder must complete registration, sign-in, second-passkey access and workspace recovery at the final origin. Until that happens, describe holder acceptance as pending. The engine performs deterministic planning with evidence references; it does not certify claims, call a generative model, render a final film or publish content.

## Invitations and older workspaces

New hosted private accounts require an administrator invitation and a real passkey. Set `WORKSPACE_INVITE_HASHES` to at most sixteen comma-separated SHA-256 hashes of independent cryptographically random 32-byte base64url codes. Keep the original codes only in private operator storage; never put them in Git, browser bundles, URLs or logs. An empty list closes new registration. A challenge binds its invitation; only successful verified enrollment consumes it atomically with account creation. Existing account sign-in and additional recovery passkeys do not require a new invitation within their account capacity.

A valid bounded older store that exceeds the new account or per-account reservations enters protected recovery mode. Existing users retain sign-in, saved work and export. Historical workspaces remain read-only until an operator migrates them; local editing and export remain available. It accepts counter updates with bounded headroom, preserves all credential identities and does not rewrite files during startup. The recovery profile persists on the first normal save/login update, so shrinking and restarting never reopens admission. New accounts and additional credentials stay closed until an operator reviews and migrates capacity with backup and explicit acceptance; no automated deletion or silent quota increase occurs.

Original-format aggregate, per-entry and access metadata allocations are retained in the recovery profile even when they exceed the new reservations. Incoming requests keep the strict current validation. Historical workspace fingerprints prevent replacements or shape changes, while verified credential counters can still advance. Preserve the original store and measure load plus serialization RSS before changing a release. Stores above the 8 MiB private-file guard or the configured unit memory budget need offline migration first: leave the previous service running, keep every original file and credential, and do not restart into an incompatible store.

The 8 MiB limit applies to original stores without a recovery profile. A validated read-only recovery store has a separate 24 MiB total file ceiling, including its generated profile. Startup checks the complete augmented candidate before accepting recovery; its first counter update and later reload use the same bound. This is profile headroom, not extra writable space for visitors. Deployment preflight must measure the augmented candidate and its RSS before switching releases.
