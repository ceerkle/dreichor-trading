# Persistence Model — Phase 2

## Purpose

This document defines the persistence model of the Dreichor backend
as it exists after Phase 1.5 and as observed in Phase 2.

The persistence model is the foundation of:
- determinism
- replayability
- auditability
- observability

Only persistence mechanisms that are implemented and active are described.

---

## Core Principles

1. Audit-first persistence
2. Append-only storage
3. Deterministic replay
4. No hidden state
5. No background writes

Persistence is authoritative. In-memory state is always derived.

---

## Persistence Modes

### Filesystem Persistence (Active)

The runtime currently uses filesystem-based persistence exclusively.

Characteristics:
- Append-only
- Human-readable (NDJSON)
- Deterministic ordering
- Crash-safe by design

This is the only persistence mode used in Phase 1.5 and Phase 2.

---

### Database Persistence (Prepared, Inactive)

Postgres connectivity exists but is not used for domain persistence.

Current status:
- TCP connectivity check only
- Migration runner exists
- No domain tables defined
- No reads or writes performed by runtime

Database persistence is explicitly out of scope for Phase 2 observability.

---

## Audit Event Persistence

### Audit Event Store

- Format: NDJSON (one JSON object per line)
- Write mode: append-only
- Read mode: read-all on startup
- Ordering: file order is authoritative

Audit events represent the canonical history of all decisions and outcomes.

---

### Audit Event Contract

- Versioned union type (v1)
- Each event is self-contained
- No implicit references
- No derived data stored

Audit events are never mutated or deleted.

---

## Snapshot Persistence

### Snapshot Store

- Format: NDJSON
- Write mode: append-only
- Read mode: read-latest only
- Snapshot type: SHADOW_LEDGER_SNAPSHOT

Snapshots are performance optimizations, not sources of truth.

---

### Snapshot Semantics

- A snapshot represents a complete Shadow Ledger state
- Only the latest snapshot is used during replay
- Older snapshots are retained for auditability

If no snapshot exists, replay starts from an empty ledger.

---

## Replay Model

Replay happens only at startup.

Replay order:
1. Load all audit events
2. Reduce Decision Memory from audit events
3. Load latest snapshot
4. Restore Shadow Ledger from snapshot
5. Wire Meta Orchestrator

Replay is deterministic and idempotent.

---

## Failure Behavior

Persistence failures are fatal.

The runtime will:
- fail fast if audit storage is unavailable
- fail fast if snapshots are malformed
- refuse to start if mounts are missing or not writable

Silent degradation is forbidden.

---

## Observability Implications

Observer APIs may:
- read audit event files
- read snapshot files
- compute derived state from persisted data

Observer APIs may NOT:
- write audit events
- write snapshots
- trigger persistence actions
- modify persistence configuration

---

## Explicit Non-Goals

The following are intentionally excluded:

- Live database queries
- Partial replay
- Incremental replay during runtime
- Snapshot compaction
- Log rotation
- Retention policies

All of the above require a future phase.

---

## Phase Constraint

The persistence model is frozen for Phase 2.

Any change to persistence semantics requires:
- a new phase
- updated replay guarantees
- updated observability contracts