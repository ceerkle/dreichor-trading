# ADR 0001 — Phase 2 Read-Only Observability

## Status

Accepted

---

## Context

After completing Phase 1.5, the Dreichor backend runtime is:

- deterministic
- replayable
- audit-first
- operationally stable
- intentionally idle after startup

At this stage, the system lacks any user-facing observability beyond logs
and direct filesystem inspection.

There is a clear need to:
- inspect runtime state
- inspect persisted audit data
- verify correctness after restarts
- build operator confidence

However, introducing observability must NOT compromise:
- determinism
- safety guarantees
- phase boundaries

---

## Decision

Phase 2 introduces **read-only observability**.

This means:
- exposing runtime and persistence state via HTTP APIs
- strictly prohibiting any state mutation
- prohibiting any execution or control actions
- prohibiting ticks, commands, or side effects

The runtime remains operationally idle.

---

## Scope of Observability

Phase 2 observability includes:

- runtime metadata (version, environment, configuration)
- persistence paths and file-level information
- audit event inspection (read-only)
- snapshot inspection (read-only)
- deterministically derived state:
  - decision memory
  - shadow ledger

All observed data MUST already exist or be derivable.

---

## Explicit Constraints

Observer APIs MUST NOT:

- write audit events
- write snapshots
- mutate in-memory state
- trigger replay
- trigger execution
- invoke MetaOrchestrator.tick(...)
- affect safety gates
- interact with exchanges
- modify persistence

Any endpoint that violates these rules is forbidden.

---

## Security Model

Observability endpoints are:
- protected by Cloudflare Access
- available only to authenticated operators
- environment-scoped (dev vs prod)

No public or unauthenticated access is allowed.

---

## Rationale

Read-only observability provides:

- operational transparency
- confidence in determinism
- safe inspection without risk
- a foundation for future UI work

By explicitly forbidding control or mutation,
Phase 2 avoids accidental scope creep into Phase 3.

---

## Alternatives Considered

### Full Control API

Rejected because:
- it introduces execution risk
- it violates Phase 1.5 guarantees
- it blurs phase boundaries

---

### No Observability Until UI

Rejected because:
- it delays operational feedback
- it forces reliance on logs only
- it increases deployment risk

---

## Consequences

### Positive

- Operators gain visibility into system state
- Determinism remains intact
- Future UI can be built safely on top

---

### Negative

- No runtime interaction is possible
- No live system steering
- Observability requires explicit API work

These limitations are intentional.

---

## Follow-Up Decisions

- ADR 0002 defines what is explicitly forbidden in Phase 2
- Future phases may introduce controlled mutation APIs

---

## Closing Statement

Phase 2 observability is about **seeing without touching**.

Anything more requires a new phase.