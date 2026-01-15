# Non-Goals and Guardrails — Phase 2

## Purpose

This document defines the explicit non-goals and guardrails for the
Dreichor backend during Phase 2 (read-only observability).

Its purpose is to:
- prevent scope creep
- protect determinism guarantees
- clearly separate observation from control
- ensure Phase 2 cannot accidentally evolve into Phase 3

Anything not explicitly allowed here is forbidden.

---

## Fundamental Constraint

Phase 2 is **strictly read-only**.

No backend capability may:
- mutate state
- trigger execution
- influence future behavior
- create new persisted data

Observability must be passive.

---

## Explicit Non-Goals

The following are explicitly **out of scope** for Phase 2.

### No Control APIs

- No start / stop commands
- No tick triggering
- No strategy enable / disable
- No safety gate mutation
- No runtime configuration changes

All Meta-Orchestrator control paths remain unreachable.

---

### No State Mutation

Observer endpoints must never:
- write audit events
- write snapshots
- modify in-memory state
- influence replay behavior

All state exposure is derived or static.

---

### No Scheduling or Loops

Phase 2 does not introduce:
- schedulers
- background jobs
- polling loops
- cron-like behavior
- periodic state refresh

The runtime remains idle after startup.

---

### No User Input Semantics

Observer endpoints do not accept:
- commands
- filters that influence behavior
- payloads that alter computation
- free-form queries

All inputs are bounded, validated, and non-influential.

---

### No Authentication Logic in Backend

The backend does not:
- implement login flows
- manage user identities
- issue or validate JWTs
- perform authorization decisions

All authentication and authorization is handled externally
(e.g. Cloudflare Access).

---

### No Multi-Tenancy

Phase 2 assumes:
- a single runtime
- a single persistence domain
- a single operator trust context

No tenant isolation or scoping is provided.

---

## Guardrails

The following guardrails are mandatory.

### Determinism Guardrail

Observer functionality must:
- be deterministic
- produce identical output given identical persisted state
- avoid wall-clock time
- avoid randomness

---

### Interface Stability Guardrail

Once an observer endpoint is introduced:
- its contract is versioned
- breaking changes require a new phase or new version
- fields are never removed silently

---

### Infrastructure Guardrail

All observer endpoints must:
- be reachable only through Cloudflare Access
- be bound to localhost internally
- expose no public listening interfaces

---

### Failure Transparency Guardrail

Failures must:
- surface immediately
- return explicit errors
- never degrade silently
- never fall back to partial data

---

## Phase Boundary Enforcement

Phase 2 ends when:
- any control path is introduced
- any write path is enabled
- runtime behavior changes after startup

Such changes require:
- a new phase declaration
- updated documentation
- explicit design review

---

## Closing Rule

Phase 2 exists to **see**, not to **act**.

The backend remains boring, static, and predictable.

Any deviation breaks the phase.