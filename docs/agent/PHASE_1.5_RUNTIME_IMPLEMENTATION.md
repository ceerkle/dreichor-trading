AGENT BRIEFING — Phase 1.5 Runtime Implementation (v2)

Branch: infra/phase-1.5-runtime
Base: develop

────────────────────────────────────────
Goal
────────────────────────────────────────

Implement a production-near, deterministic PAPER runtime that can:

- run on a single server (Hetzner)
- restart safely at any time
- replay state exactly from persistence
- expose all behavior via logs

No live trading. No UI. No shortcuts.

────────────────────────────────────────
Hard Rules (Non-Negotiable)
────────────────────────────────────────

- Docs are the sole source of truth
- Do NOT change src/core/**
- Do NOT invent behavior
- Fail fast on ambiguity
- One step at a time
- Exactly one commit per step
- All tests must stay green

────────────────────────────────────────
Execution Order (Strict)
────────────────────────────────────────

Follow this order exactly.
No skipping. No reordering.

────────────────────────────────────────
STEP 1 — Dockerfile & Infra Skeleton
────────────────────────────────────────

Purpose:
Create a deterministic, production-ready runtime container without
implementing runtime logic yet.

References:
- infra/README.md
- infra/DEPLOYMENT_MODEL.md
- infra/RUNTIME_STARTUP_SEQUENCE.md

Requirements:
- Create infra/ directory if missing
- Add infra/docker/Dockerfile.runtime
- Multi-stage build:
  - Stage 1: npm ci, npm test, npm run build
  - Stage 2: npm ci --omit=dev + dist/
- Node.js version MUST match documented toolchain
- No secrets baked into image
- No local persistence inside container
- Runtime container is ephemeral
- Dockerfile MUST reference (but not implement):
  npm run start:paper

Important:
start:paper does not exist yet.
Dockerfile may reference it, but MUST NOT implement runtime behavior.

Deliverables:
- infra/docker/Dockerfile.runtime
- infra/README.md updated if needed
- Commit message:
  "infra: add runtime Dockerfile and infra skeleton (phase 1.5)"

STOP if:
- Any required env var meaning is unclear
- Any implicit default would be required
- Runtime behavior would need to be invented

────────────────────────────────────────
STEP 2 — docker-compose (Local / Server)
────────────────────────────────────────

Purpose:
Define the minimal operational topology.

Reference:
- infra/DEPLOYMENT_MODEL.md

Requirements:
- Exactly two services:
  - runtime
  - postgres
- Explicit named volumes for:
  - audit events
  - snapshots
- No networking magic
- No additional services
- Runtime MUST NOT start if persistence is unavailable

Deliverables:
- docker-compose.yml or compose.phase-1.5.yml
- Clear, explicit service boundaries
- Commit message:
  "infra: add docker-compose for phase 1.5 runtime"

STOP if:
- Persistence boundaries are unclear
- Runtime could start without durable storage

────────────────────────────────────────
STEP 3 — Environment Validation
────────────────────────────────────────

Purpose:
Fail fast on misconfiguration.

Reference:
- infra/.env.schema.md

Requirements:
- Strict env validation at startup
- Missing required vars → startup failure
- Unknown vars → startup failure
- No defaults in code
- Validation lives in runtime layer, not core

Deliverables:
- Env validation module
- Wired into runtime startup sequence
- Commit message:
  "infra: enforce strict env validation at startup"

STOP if:
- Any env var semantics are ambiguous

────────────────────────────────────────
STEP 4 — Database & Migrations
────────────────────────────────────────

Purpose:
Make schema ownership explicit.

Reference:
- infra/DB_MIGRATION_MODEL.md

Requirements:
- Explicit migration runner
- Versioned migration folder
- Migrations run before runtime start
- Runtime MUST NOT auto-migrate
- Runtime fails if schema is incompatible

Deliverables:
- Migration script / command
- Migration folder structure
- Commit message:
  "infra: add explicit db migration runner (phase 1.5)"

STOP if:
- Migration order or ownership is unclear

────────────────────────────────────────
STEP 5 — Paper Runtime Startup
────────────────────────────────────────

Purpose:
Bring the system to life deterministically.

References:
- infra/RUNTIME_STARTUP_SEQUENCE.md
- Meta Orchestrator v1
- Persistence Runtime v1

Requirements:
- Implement src/runtime/index.ts
- ExecutionPlane = PAPER only
- No exchange adapters
- Explicit startup phases with logs
- Replay from persistence on startup
- Runtime blocks / runs event loop

Deliverables:
- Runtime entrypoint
- Observable logs for each startup phase
- package.json script:
  "start:paper": "node dist/src/runtime/index.js"
- Commit message:
  "infra: implement paper runtime startup sequence"

STOP if:
- Any implicit behavior is required
- Live execution would be possible

────────────────────────────────────────
Non-Goals (DO NOT IMPLEMENT)
────────────────────────────────────────

- Binance or any exchange
- UI
- Background workers
- Schedulers
- HA / clustering
- CI/CD pipelines
- Secret managers

────────────────────────────────────────
Completion Criteria (Phase 1.5)
────────────────────────────────────────

Phase 1.5 is complete when:
- Runtime starts via container
- Runtime can be restarted safely
- Replay produces identical state
- All behavior is observable via logs
- No undocumented behavior exists

────────────────────────────────────────
Final Rule
────────────────────────────────────────

If any step is ambiguous:
STOP immediately and ask for clarification.

Phase 1.5 exists to make the system boring,
predictable, and trustworthy.