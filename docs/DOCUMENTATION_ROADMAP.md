# Documentation Roadmap — End-to-End

## Purpose
This document defines the **complete documentation roadmap** for the project.
It ensures that no architectural, semantic, or operational aspect is forgotten
before implementation begins.

All documents listed here are **final documents**.
They are written first, reviewed, and only then implemented by an agent.

---

## Guiding Principles

- Documentation comes before code.
- No document is provisional.
- No implementation may contradict documented decisions.
- The Cursor Agent follows documents, not intent.

---

## Phase 1 — Core Semantics

### 1. Glossary & Core Definitions
**Path:** `docs/core/GLOSSARY.md`

Defines all core terms used throughout the system.
This document establishes a shared language for humans and agents.

---

### 2. Domain Model Overview
**Path:** `docs/core/DOMAIN_MODEL.md`

Describes the fundamental domain entities and their relationships
without implementation details.

---

## Phase 2 — Decision & Strategy Semantics

### 3. Strategy Lifecycle Specification
**Path:** `docs/strategy/STRATEGY_LIFECYCLE.md`

Defines the complete lifecycle of a strategy instance from initialization
to cooldown and re-entry.

---

### 4. Attention & Worthiness Model
**Path:** `docs/strategy/ATTENTION_WORTHINESS_MODEL.md`

Formal definition of market attention, worthiness,
and market-to-market comparison rules.

---

### 5. Parameter Pools & Edgecase Selection
**Path:** `docs/strategy/PARAMETER_POOLS.md`

Defines allowed parameter pools, selection rules,
and constraints to prevent uncontrolled adaptation.

---

## Phase 3 — Execution & Reality

### 6. Execution Plane Specification
**Path:** `docs/execution/EXECUTION_PLANES.md`

Defines Paper and Live execution semantics,
guarantees, and failure modes.

---

### 7. Shadow Ledger Specification
**Path:** `docs/execution/SHADOW_LEDGER.md`

Defines the theoretical execution shadow used
to detect execution deviations.

---

### 8. Safety & Risk Model
**Path:** `docs/execution/SAFETY_MODEL.md`

Defines safety triggers, priority rules,
and emergency exit behavior.

---

## Phase 4 — Memory, Feedback & Audit

### 9. Decision Memory Specification
**Path:** `docs/memory/DECISION_MEMORY.md`

Defines how decision memory is stored,
aggregated, and applied.

---

### 10. User Feedback Model
**Path:** `docs/memory/USER_FEEDBACK.md`

Defines how user feedback is captured
without introducing bias.

---

### 11. Persistence & Audit Model
**Path:** `docs/persistence/AUDIT_PERSISTENCE.md`

Defines which events are persisted,
how aggregation works, and replay guarantees.

---

## Phase 5 — Meta & Control

### 12. Meta Layer Specification
**Path:** `docs/meta/META_LAYER.md`

Defines orchestration responsibilities
outside of business logic.

---

### 13. Preflight & Readiness Checks
**Path:** `docs/meta/PREFLIGHT.md`

Defines required checks before execution,
especially for Live runs.

---

## Phase 6 — Agent Enablement

### 14. Git & Commit Strategy
**Path:** `docs/agent/GIT_EXECUTION_PLAN.md`

Defines commit structure, branching,
and refactoring rules for agent execution.

---

### 15. Agent Implementation Order
**Path:** `docs/agent/CURSOR_EXECUTION_ORDER.md`

Defines the exact order in which an agent
must implement the system.

---

## Completion Criteria

Documentation is considered complete when:
- All listed documents exist
- All documents are internally consistent
- No ADR or Manifest is contradicted

Only after completion may implementation begin.
