PHASE 2 – EXECUTION GOVERNANCE OVERRIDE

Purpose

This document defines a phase-scoped execution governance override
for Phase 2 (Read-Only Observability) of the system.

It exists to prevent conflicts between the generic agent execution rules
and the documented Phase-2 architecture, scope, and workflow.


Scope

This override applies only to:

- Phase 2: Read-Only Observability
- Observer Runtime
- Observer API
- UI preparation (read-only, separate repository)

It does not affect:

- Phase 1 / Phase 1.5 Core Runtime
- Phase 3 and later phases (Control, Execution, Interaction)
- RAGE domain logic or execution semantics


Authority Hierarchy (Phase 2)

For all Phase 2 work, the authoritative order of truth is:

1. Phase-2 documentation under /docs (including ADRs and contracts)
2. Phase-2–specific governance and agent instructions
3. Generic agent execution rules under docs/agent/*
4. Tooling or implementation convenience

If any conflict exists between these layers, Phase-2 documentation
and Phase-2 governance rules take precedence.


Execution Order (Phase 2)

Phase 2 explicitly does NOT follow the generic execution order defined in:

docs/agent/CURSOR_EXECUTION_ORDER.md

Instead, Phase 2 follows a phase-local, docs-first execution order,
defined by the Phase-2 documentation itself.

The canonical Phase-2 execution sequence is:

1. Observer API contracts (versioned, frozen, docs-first)
2. Observer runtime structural skeleton (no logic, no IO)
3. Read-only persistence inspection endpoints
4. Deterministic derived-state reconstruction
5. Hardening, validation, and failure transparency
6. Read-only UI consumption (separate repository)


Branching Rules (Phase 2)

Phase 2 work is performed on phase-scoped branches, such as:

- phase2/observer-runtime-v1

The generic agent branch rule (agent/implementation) does not apply
to Phase 2 work.


Testing Rules (Phase 2)

Tests are required for Phase 2, but their introduction follows
the Phase-2 execution order.

Specifically:

- Contract-only and structural skeleton steps may omit tests
- Tests become mandatory starting with the first step that introduces:
  - filesystem IO
  - persistence reads
  - reconstruction logic

All tests must be deterministic and replayable.


Non-Negotiable Constraints (Still Apply)

This override does NOT relax any of the following global rules:

- Docs-first development
- Determinism guarantees
- No speculative abstractions
- No undocumented behavior
- No control, command, or mutation paths
- Strict read-only semantics
- Safety overrides everything


Summary

Phase 2 is intentionally isolated from the generic agent execution flow.
This override formalizes that isolation to preserve architectural clarity,
prevent accidental feature leakage, and ensure that observability remains
strictly passive and deterministic.