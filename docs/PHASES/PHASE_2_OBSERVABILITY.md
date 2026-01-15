# Phase 2 — Observability & Read-Only Interface

## Purpose

Phase 2 introduces a **strictly read-only observability layer** on top of the Phase 1.5 runtime.

The goal of Phase 2 is to make the system **inspectable by a human** without changing its behavior, guarantees, or operational model.

This phase exists solely to **observe what already exists**.

No new behavior is introduced.

---

## Relationship to Phase 1.5

Phase 1.5 is **closed and frozen**.

All guarantees defined in Phase 1.5 remain valid and enforced:

- Determinism is preserved
- Replay correctness is preserved
- PAPER execution plane only
- No background execution
- No implicit behavior
- No live trading
- No mutation without explicit input

Phase 2 **must not** alter:
- Core logic (`src/core/**`)
- Runtime startup, replay, or shutdown behavior
- Persistence formats (AuditEvents, Snapshots)
- Execution semantics

Phase 2 may only **read** existing state.

---

## Scope of Phase 2

Phase 2 provides:

- A read-only backend observability API
- Human-accessible inspection of runtime state
- Deterministic derived views based on persisted data
- A foundation for a future UI

Phase 2 does **not** introduce:

- Runtime control or commands
- Strategy creation, mutation, or deletion
- Tick execution or scheduling
- Safety gate changes
- Live execution
- Multi-user features
- Alerts or notifications

---

## Architectural Overview

Phase 2 introduces **one new component**:

- **Observer API** (read-only)

The system architecture becomes:

- Runtime (unchanged)
- Observer API (new, read-only)
- UI (future, out of scope for Phase 2 backend)

The Observer API:
- Does not drive the runtime
- Does not mutate state
- Does not trigger ticks
- Does not write to persistence
- Does not cache or transform state beyond deterministic replay

All responses are derived from:
- Filesystem audit logs
- Filesystem snapshots
- Environment configuration
- Deterministic replay logic already present in the codebase

---

## Trust & Access Model

The Observer API is **not public**.

Access is controlled externally (e.g. Cloudflare Access).

The backend:
- Trusts the access layer
- Performs no authentication logic beyond header presence
- Exposes no anonymous endpoints

This ensures observability is available **only to the system owner**.

---

## Design Principles

Phase 2 adheres to the following principles:

- Read-only by construction
- No side effects
- No hidden state
- No background execution
- No heuristics or inference
- Deterministic output for identical input
- Explicit failure over silent degradation

If an observable cannot be produced safely, the system must fail explicitly.

---

## Success Criteria

Phase 2 is considered complete when:

- Runtime state can be inspected without modifying behavior
- Observability is sufficient to answer: “What is the system doing?”
- No Phase 1.5 guarantees are weakened
- No future Phase 3 requirements are preemptively implemented

At that point, the system becomes **transparent without becoming mutable**.

---

## Closing Rule

Phase 2 is an observability phase.

Control, governance, and live execution belong to future phases.

Any feature that introduces behavior change requires a new phase declaration.