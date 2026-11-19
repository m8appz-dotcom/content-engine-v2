# Architecture

Content Engine v2 is a clean-room app. It does not copy Content Engine v1 or Bobi Video App architecture.

Initial vertical slice:

1. Next.js route handlers for MVP API.
2. SQLite via better-sqlite3 with explicit repository functions.
3. Server-side job state machine.
4. Source Registry validation before evidence collection.
5. Mock provider registry until Tier 0 is proven.

Core invariant: model/provider output must pass schema validation and business validation before DB writes.
