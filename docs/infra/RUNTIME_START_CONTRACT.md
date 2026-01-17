# Runtime Start Contract (Phase 1.5)

This document defines exactly how the runtime starts,
in which order checks occur, and when startup MUST fail.

It is a hard contract between infrastructure, runtime, and operators.

The runtime MUST NOT start partially.
Either startup completes successfully, or the process exits.

---

## Purpose

The Runtime Start Contract exists to ensure that:

- the system never runs in an undefined state
- persistence and safety guarantees are validated before execution
- restarts are deterministic and safe
- replay is always possible

Startup is treated as a critical, audited operation.

---

## Core Principles

- Fail fast
- No implicit defaults
- No background recovery
- No retries
- No side effects before validation completes

---

## Startup Phases (Strict Order)

The runtime MUST execute the following phases in order.
No phase may be skipped or reordered.

---

### Phase 1 — Environment Validation

The runtime MUST validate all required environment variables as defined in:

- `docs/infra/ENV_SCHEMA.md`

Rules:
- missing variables → startup failure
- invalid values → startup failure
- forbidden combinations (e.g. live without credentials) → startup failure

No IO is allowed in this phase.

---

### Phase 2 — Persistence Connectivity Check

The runtime MUST verify persistence availability.

Checks:
- database connection can be established
- schema is reachable
- required tables exist (or migrations are available)

Rules:
- if persistence is unavailable → startup failure
- runtime MUST NOT continue in degraded mode
- no in-memory fallback is permitted

---

### Phase 3 — Persistence Contract Validation

The runtime MUST validate that persistence is compatible with the runtime.

Checks:
- audit event schema version matches runtime expectations
- snapshot schema version matches runtime expectations

Rules:
- version mismatch → startup failure
- incompatible schema → startup failure

---

### Phase 4 — Replay Capability Check

The runtime MUST verify that replay is possible.

Checks:
- audit event store can be read
- replay reducer can be initialized
- no structural corruption is detected

Rules:
- runtime MUST NOT mutate state during this phase
- any replay error → startup failure

---

### Phase 5 — Initial State Reconstruction

The runtime MUST reconstruct its initial state deterministically.

Steps:
- read audit events ordered by logical time
- apply reducers:
  - Shadow Ledger
  - Decision Memory
- load latest valid snapshots if configured

Rules:
- reconstructed state MUST be identical on repeated restarts
- no execution may occur in this phase

---

### Phase 6 — Safety Gate Initialization

The runtime MUST initialize safety state.

Inputs:
- SAFETY_MODE environment variable
- reconstructed Shadow Ledger state

Rules:
- safety gates MUST be explicit
- no safety defaults are allowed
- invalid safety configuration → startup failure

---

### Phase 7 — Execution Plane Lock-In

The runtime MUST lock in the execution plane.

Rules:
- execution plane is read once at startup
- execution plane MUST NOT change at runtime
- plane choice MUST be auditable

---

### Phase 8 — Runtime Ready State

Only after all previous phases succeed:

- runtime may begin accepting ticks
- runtime may begin producing decisions
- execution MAY occur subject to safety

The runtime MUST emit a RuntimeReady log entry.

---

## Failure Semantics

If startup fails at any phase:

- the process MUST exit
- no partial runtime MUST remain active
- no execution MUST have occurred
- no recovery or retry MUST be attempted automatically

Restarts are external responsibilities.

---

## Determinism Guarantees

Startup MUST be deterministic:

- same environment and same persistence yield the same reconstructed state
- no wall-clock time is used
- no randomness is permitted

---

## Observability Requirements

During startup the runtime MUST log:

- phase boundaries
- success or failure of each phase
- explicit reason for failure

Logs MUST NOT include secrets.

---

## Non-Goals (Phase 1.5)

This contract does NOT include:

- rolling restarts
- hot reload
- multi-runtime coordination
- leader election
- partial availability modes

---

## Closing Rule

Any change to startup behavior requires:

- update to this document
- explicit review
- validation via replay test

Startup behavior MUST remain boring, explicit, and predictable.