# Runtime State Model — Phase 2

## Purpose

This document defines the complete runtime state model as it exists
in Phase 1.5 and is observed in Phase 2.

The goal is to describe precisely:
- which state exists
- where it lives (memory, filesystem, derived)
- how it is created
- how it may be observed

No speculative or future state is included.

---

## Fundamental Principle

The runtime has **no continuously evolving state**.

All meaningful state is:
- reconstructed deterministically at startup
- immutable during runtime idle
- derived exclusively from persisted data

After startup, the runtime is effectively static unless explicitly
extended in a future phase.

---

## Runtime Lifecycle Phases

1. Process start
2. Environment validation
3. Persistence initialization
4. Replay and reconstruction
5. Meta-orchestrator wiring
6. Idle (READY)
7. Graceful shutdown

All state is established during phases 2–4.

---

## In-Memory State

The following state exists only in memory and is created at startup.

### Audit Events (Loaded Set)

- Source: Filesystem audit event store
- Scope: All persisted audit events
- Lifetime: Startup only (loaded once)
- Mutability: Immutable after load

Purpose:
- Input for deterministic replay
- Source for observer-derived views

---

### Decision Memory

- Source: Deterministic reduction over audit events
- Persistence: None (replay-only)
- Mutability: Immutable after startup

DecisionMemory represents the accumulated decision history
and is fully reconstructible at any time.

---

### Shadow Ledger

- Source: Latest persisted snapshot OR empty initial state
- Persistence: Snapshots only (not continuously stored)
- Mutability: Immutable after startup

The Shadow Ledger represents the authoritative paper-state
of positions and balances.

---

### Meta Orchestrator Instance

- Purpose: Wiring of execution pipeline
- Active Loop: None
- Tick Execution: Not invoked in Phase 1.5

The Meta Orchestrator exists but is dormant.

---

## Persisted State

Persisted state is authoritative and append-only.

### Audit Events

- Storage: NDJSON (append-only)
- Contract version: v1
- Ordering: File order is authoritative
- Writes: Only during active ticks (not in Phase 2)

Audit events are the primary source of truth.

---

### Snapshots

- Storage: NDJSON (append-only)
- Contract version: v1
- Snapshot Type: SHADOW_LEDGER_SNAPSHOT
- Reads: latest snapshot only

Snapshots accelerate replay but never replace audit events.

---

## Derived State

Derived state is computed on demand and never persisted.

### Derived Shadow Ledger

- Source: latest snapshot
- Fallback: empty ledger
- Deterministic: Yes

---

### Derived Decision Memory

- Source: audit events
- Reducer: deterministic
- Deterministic: Yes

---

## State That Does NOT Exist

Explicitly absent in Phase 2:

- No live strategy state
- No running ticks
- No scheduler state
- No execution queues
- No background workers
- No in-flight orders
- No async pipelines

---

## Observability Rules

Observer APIs may:
- read persisted state
- reconstruct derived state
- expose environment metadata
- expose runtime readiness

Observer APIs may NOT:
- mutate state
- trigger replay
- execute ticks
- write snapshots or events

---

## Phase Constraint

This state model is frozen for Phase 2.

Any new mutable or long-lived state requires:
- a new phase
- an updated state model document
- explicit determinism analysis