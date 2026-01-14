# Core v1 — Approved

**Project:** dreichor-trading  
**Scope:** Core System (Decision → Intent → Execution → Observation)  
**Version:** v1  
**Status:** APPROVED  
**Review Basis:** Branch `review/core-v1`  
**Review Datum:** 2026-01-XX

---

## Purpose of This Document

This document formally certifies that **Core v1** of the system is:

- internally consistent
- deterministically replayable
- fully documented
- agent-safe
- suitable as a stable foundation for further development

This approval applies **only** to the Core layer as reviewed.
It does not imply production readiness, profitability, or safety in real markets.

---

## Approved Scope

The following areas are explicitly covered by this approval:

### Core Decision & Observation Pipeline
- Domain Types & Value Objects
- Strategy Lifecycle State Machine
- Attention / Worthiness Gating
- Parameter Pool Selection
- Order Intent Creation
- Execution Planes (Paper + Live Stub)
- Shadow Ledger
- Safety Model (Execution-side)
- Audit & Persistence Contracts
- User Feedback Integration
- Decision Memory

### Architectural Guarantees
- RAGE / NOISE / MEATSPACE separation
- Deterministic logical time (no wall-clock)
- No implicit IO or side effects
- Append-only observation model
- Replay-stable reducers

---

## Key Invariants (Verified)

The following invariants are upheld across the entire Core v1 codebase:

### Determinism
- Identical inputs produce identical outputs
- All IDs are deterministically derived
- No randomness or wall-clock time is used
- Reducers are replay-stable and idempotent

### Closed Systems
- All enums and unions are closed and versioned
- No free-form strings for behavioral decisions
- No implicit defaults or fallbacks

### Separation of Concerns
- Decisions never execute actions
- Execution never influences decisions
- Observation never mutates state
- Governance is strictly external

### Auditability
- All meaningful actions are represented as AuditEvents
- Audit events are append-only and versioned
- Snapshots introduce no new facts
- Decision Memory is observational only

---

## Agent-Safety Assessment

Core v1 is considered **agent-safe** under the following criteria:

- Ambiguities are explicitly blocked, not guessed
- Structural errors throw deterministically
- Step ordering is enforced
- No behavior is inferred from missing data
- All normative behavior is documented

A compliant agent can continue development
**without inventing semantics**.

---

## Explicit Non-Goals (v1)

This approval explicitly does **not** cover:

- Runtime orchestration
- Exchange adapters
- Capital / budget enforcement
- UI / API layers
- Performance optimization
- Learning, scoring, or optimization logic
- Automatic governance or trust escalation
- The dreichor framework itself

---

## Relationship to Governance (e.g. dreichor)

Core v1 is **governance-ready**, but **not governance-driven**.

It provides:
- deterministic decision traces
- audit-grade event streams
- replayable memory structures

It does not:
- assign responsibility
- evaluate correctness
- authorize autonomy

Those concerns are delegated to external frameworks.

---

## Forward Compatibility

Core v1 is considered a **stable contract**.

Future versions may:
- extend types via version increments
- add new closed unions
- introduce new steps *after* the current pipeline

Future versions must not:
- change v1 semantics
- reinterpret v1 audit events
- retroactively infer intent

---

## Approval Statement

Based on a full review of documentation and implementation,
**Core v1 is approved as a stable, deterministic foundation**.

Further development may proceed on top of this core
without modification to v1 behavior.

Any changes to Core v1 require:
- explicit documentation updates
- version increments
- replay validation

---

**Approved by:**  
System Review (Human + Agent)  

**Signature:**  
`/docs/CORE_V1_APPROVED.md`