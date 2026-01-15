# Backend Roadmap — Phase 2 and Beyond

## Purpose

This document defines the **backend roadmap starting after Phase 1.5**.

It describes:
- which backend capabilities will be added
- in which order
- under which constraints
- and which guarantees must never be violated

This roadmap is **binding**:  
Implementation must follow this order and must not introduce behavior from later phases early.

---

## Fixed Baseline (Phase 1.5 — Completed)

The following properties are **locked and non-negotiable**:

- Deterministic core logic
- Replay-based runtime initialization
- Append-only audit persistence
- Snapshot-based ShadowLedger recovery
- PAPER execution plane only
- No background loops
- No HTTP API inside the runtime
- No UI
- No external control surface

All future backend work must preserve these properties.

---

## Phase 2 — Read-Only Observability (Current)

### Goal

Expose the internal runtime state **without changing behavior**.

Phase 2 introduces:
- visibility
- diagnostics
- inspection

It does **not** introduce:
- control
- mutation
- scheduling
- side effects

### Scope

- Read-only HTTP observer endpoints
- Strictly derived from existing persistence or replay logic
- No new state written
- No ticks triggered
- No strategy execution

### Key Guarantees

- Observability is passive
- Observability is deterministic
- Observability cannot affect runtime outcome
- Observability endpoints are safe under restart

### Examples of Allowed Data

- Runtime configuration (env, execution plane)
- Audit event history
- Snapshot metadata
- Replayed DecisionMemory
- Reconstructed ShadowLedger

---

## Phase 2.1 — Observability Hardening (Optional)

### Goal

Make observability safe, bounded, and operationally reliable.

### Possible Additions

- Pagination / limits for large audit logs
- Aggregated summaries instead of raw streams
- Explicit versioning of observer endpoints
- Strict response size limits

No semantic expansion beyond Phase 2.

---

## Phase 3 — Controlled Runtime Commands (Future)

### Goal

Introduce **explicit, auditable, externally triggered commands**.

This phase may include:
- start / stop runtime loops
- manual ticks
- controlled safety actions (halt / flatten)
- strategy lifecycle commands

### Hard Requirements

- All commands must emit audit events
- All commands must be replay-safe
- All commands must be explicitly gated
- No implicit automation

Phase 3 is the first phase where the runtime becomes *interactive*.

---

## Phase 4 — Strategy Lifecycle & Governance (Future)

### Goal

Enable managed strategy evolution under governance.

Possible features:
- strategy registration
- strategy activation / deactivation
- versioned strategy execution
- governance review flows

This phase introduces **intentional system evolution**, not learning.

---

## Phase 5 — Live Execution (Explicitly Deferred)

### Goal

Allow capital-at-risk execution.

This phase is blocked until:
- governance is proven
- observability is mature
- safety has real-world validation
- legal and operational constraints are satisfied

---

## Explicit Non-Goals

The backend roadmap explicitly excludes:

- autonomous learning
- unsupervised strategy mutation
- high-frequency trading
- background cron-style automation
- hidden retry mechanisms

If any of these are desired, they require a **new roadmap document**.

---

## Closing Rule

The backend evolves in **phases, not increments**.

Each phase:
- declares new guarantees
- preserves old ones
- is documented before implementation

No phase may be partially implemented.