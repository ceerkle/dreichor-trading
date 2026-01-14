# Architecture Overview — Modular Monolith with CHOR

## Purpose
This document defines the **non-negotiable architecture** of the system.
It is derived from the Attention & Worthiness Manifest and the Decision Memory Manifest.

This document does not describe implementation details.
It defines **structure, boundaries, and invariants**.

---

## Architectural Goals

- Deterministic decision-making
- Strict separation of intent, friction, and reality (CHOR)
- Modular monolith (single deployable unit)
- Vertical slice isolation
- Auditability and replayability
- Extensibility without destabilization

---

## Core Concept: Two Orthogonal Axes

The architecture is defined along **two independent axes**:

### Axis 1 — Responsibility Layers (Horizontal)
These are global, conceptual layers.

1. **RAGE**
   - Deterministic intent
   - Pure functions only
   - No I/O, no wall clock, no randomness

2. **NOISE**
   - Controlled friction
   - Slippage, latency, partial effects
   - Still deterministic

3. **MEATSPACE**
   - External reality
   - Exchanges, networks, clocks, secrets
   - Non-deterministic by nature

4. **META (outside CHOR)**
   - Lifecycle orchestration
   - Execution gating
   - Preflight & readiness
   - Governance integration (future)

---

### Axis 2 — Vertical Slices (Capabilities)
Vertical slices are **feature-oriented modules**.

Each slice:
- owns its logic
- can evolve independently
- passes through CHOR layers
- does not directly depend on other slices

Examples (V1):
- Market Universe
- Attention & Worthiness
- Rotation Strategy
- Execution (Paper / Live)
- Decision Memory
- Safety & Risk
- Persistence & Audit

---

## How Slices and CHOR Interact

Each vertical slice may implement logic in one or more CHOR layers.

Example:

```
RotationStrategySlice
 ├─ RAGE: decision logic
 ├─ NOISE: optional friction modeling
 └─ MEATSPACE: execution access (via contracts only)
```

Rules:
- RAGE code must never import MEATSPACE or NOISE
- NOISE code must never perform I/O
- MEATSPACE code must never decide intent

---

## Meta Layer Responsibilities

The Meta layer is **not a slice**.

Responsibilities:
- Strategy cycle orchestration
- Triggering decision evaluations
- Selecting execution planes
- Enforcing preflight checks
- Blocking or allowing execution
- Emitting lifecycle events

The Meta layer:
- does not evaluate markets
- does not score strategies
- does not modify decisions

It only controls **when** decisions are allowed to act.

---

## Modular Monolith Invariants

The system is deployed as:
- a single runtime unit
- a single versioned artifact

Modularity is enforced by:
- package boundaries
- explicit contracts
- dependency direction rules

There are:
- no distributed transactions
- no hidden network calls
- no partial system states

---

## Suggested Repository Skeleton

```
/docs
  /manifest
    ATTENTION_MANIFEST_EN.md
    DECISION_MEMORY_MANIFEST_EN.md
  /architecture
    ARCHITECTURE_OVERVIEW.md

/src
  /core
    /meta
      cycle_controller
      execution_gate
      preflight
      governance_adapter (future)

    /chor
      /rage
      /noise
      /meatspace

  /slices
    /market_universe
    /attention_worthiness
    /strategy_rotation
    /execution
    /decision_memory
    /safety
    /persistence
```

This structure is indicative.
Exact naming is implementation-specific.

---

## Dependency Rules (Non-Negotiable)

- Dependencies may only flow **downward**:
  META → SLICES → CHOR

- No slice may directly depend on another slice.
- Communication occurs via:
  - explicit data contracts
  - events emitted through Meta

Violations invalidate determinism.

---

## Extensibility Guarantees

A new slice must:
- not require changes to existing slices
- not change existing decision semantics
- integrate via Meta orchestration

If adding a feature requires modifying multiple slices,
the design is incorrect.

---

## Governance Compatibility

This architecture is intentionally compatible with external governance frameworks
(e.g. dreichor).

Governance integrates at the Meta layer:
- evaluating decision admissibility
- never influencing decision content

---

## Closing

This architecture prioritizes:
- correctness over speed
- clarity over flexibility
- responsibility over optimization

If a future change violates these principles,
the change is invalid — regardless of performance benefits.
