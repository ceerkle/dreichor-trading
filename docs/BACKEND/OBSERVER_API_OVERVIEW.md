# Observer API Overview — Phase 2

## Purpose

This document defines the **read-only Observer API** introduced in Phase 2.

The Observer API exists solely to:
- inspect runtime state
- inspect persisted history
- inspect derived deterministic state

It must never:
- mutate state
- trigger execution
- influence runtime behavior
- introduce side effects

The Observer API is **diagnostic only**.

---

## Design Principles

### Read-Only by Construction

- All endpoints are HTTP GET
- No endpoint performs writes
- No endpoint triggers ticks, replays, or evaluations
- No endpoint allocates persistent resources

### Deterministic Outputs

- All returned data is either:
  - persisted (audit events, snapshots), or
  - deterministically derived via replay logic
- Given identical persisted data, responses are identical

### Runtime Safety

- Observer endpoints must be safe during:
  - startup
  - idle state
  - shutdown
  - restarts
- Failure to read data must fail explicitly and visibly

### Authentication Boundary

- Observer API is **not public**
- Access is restricted via infrastructure-level access control
  (e.g. Cloudflare Access / service tokens)
- No application-level auth logic is introduced in Phase 2

---

## API Namespace

All observer endpoints live under:

/v1/observe/*

This namespace is reserved exclusively for:
- passive inspection
- diagnostics
- observability

No command or control endpoints may exist under this prefix.

---

## High-Level Endpoint Categories

### Runtime Introspection

Endpoints that expose static or startup-time runtime information.

Examples:
- runtime version
- execution plane
- configured persistence mode
- enabled safety mode

These values are sourced from:
- environment variables
- startup validation results

---

### Persistence Inspection

Endpoints that expose persisted data **as-is**.

Sources:
- append-only audit event logs
- append-only snapshot logs

Properties:
- no filtering beyond safe limits
- no reordering
- no mutation

---

### Derived State Inspection

Endpoints that expose **deterministically replayed state**.

Derived exclusively via:
- replaying audit events
- loading latest snapshot
- applying pure reducers

Examples:
- DecisionMemory
- ShadowLedger state

No new computation paths are introduced.

---

## Candidate Endpoint Set (Non-Binding)

The following endpoints are candidates based on existing runtime capabilities.
They are not commands; they reflect what is already present.

Runtime:
- GET /v1/observe/runtime/status

Persistence:
- GET /v1/observe/persistence/paths
- GET /v1/observe/persistence/audit-events
- GET /v1/observe/persistence/audit-events/summary
- GET /v1/observe/persistence/snapshots/latest

Derived:
- GET /v1/observe/derived/decision-memory
- GET /v1/observe/derived/shadow-ledger

Each endpoint must be implemented strictly from existing data sources.

---

## Versioning Strategy

- Observer API is versioned independently of runtime internals
- Phase 2 introduces v1
- Breaking changes require:
  - new version namespace
  - parallel support where feasible

---

## Explicit Non-Goals

The Observer API must not include:

- strategy execution
- runtime control
- tick invocation
- safety gate mutation
- configuration changes
- database writes
- background jobs

Any endpoint that violates these rules is out of scope.

---

## UI Relationship

The Observer API is the **sole data source** for the Phase 2 UI.

The UI:
- must not bypass the API
- must not read persistence directly
- must not infer hidden state

Observer API responses define the UI’s truth.

---

## Closing Rule

If an endpoint cannot be implemented using:
- existing persistence, or
- existing deterministic replay logic

then it does not belong in Phase 2.

Observation comes before interaction.