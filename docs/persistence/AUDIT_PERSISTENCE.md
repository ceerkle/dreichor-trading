# Audit & Persistence Model

## Purpose
This document defines **what is persisted**, **why it is persisted**,
and **how persistence supports auditability and replay**
without creating timeline spam.

Persistence exists for accountability, not analytics.

---

## Core Principle

> Persist only what is necessary to explain and reconstruct behavior.

Anything not required for audit or replay must not be stored.

---

## Persistence Categories

The system persists data in the following categories:

1. Material Events
2. Aggregated Rollups
3. Periodic Snapshots

Raw streams are not persisted by default.

---

## Material Events

Material Events represent significant state transitions.

Examples:
- Decision Made
- OrderIntent Created
- OrderIntent Skipped
- Order Submitted
- Execution Result
- Safety Triggered
- Safety Executed

Material Events must:
- be immutable
- include reason codes
- reference related entities

---

## Aggregated Rollups

Rollups summarize high-frequency behavior.

Examples:
- Market scan summaries
- Candidate selection summaries
- Execution health summaries

Rollups:
- are time-windowed
- are compact
- do not store raw observations

Rollups exist to support insight without noise.

---

## Periodic Snapshots

Snapshots capture complete system state at defined intervals.

Examples:
- Strategy Instance State
- Positions and allocations
- Decision Memory summaries

Snapshots enable:
- replay starting points
- state inspection
- failure recovery

---

## Replay Guarantees

The system must support replay that:

- reconstructs decisions deterministically
- does not depend on wall-clock time
- does not rely on inferred intent

Replay uses:
- material events
- snapshots
- deterministic logic

---

## Retention Rules

Retention policies must:
- favor summaries over raw data
- allow pruning without losing auditability
- be explicitly defined

No implicit data retention is allowed.

---

## Isolation

Persistence must:
- not influence runtime decisions
- not introduce hidden coupling
- be write-only from decision perspective

Reading persisted data for decisions is forbidden,
except via Decision Memory abstractions.

---

## Failure Handling

Persistence failures must:
- be explicit
- not silently drop material events
- escalate to Meta Layer

Audit loss is a critical incident.

---

## Non-Goals

Persistence does not:
- provide analytics dashboards
- support backtesting
- store tick-by-tick history
- optimize performance

---

## Closing Rule

Any new persisted data type requires
explicit documentation here before use.

No silent persistence expansion is permitted.
