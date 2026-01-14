# Git & Agent Execution Plan

## Purpose
This document defines the **mandatory Git workflow**
for implementing the system using an automated coding agent.

The goal is:
- traceability
- reproducibility
- minimal diff ambiguity

Git history is part of the system audit surface.

---

## Core Principle

> One commit expresses one completed idea.

No commit may mix concerns.

---

## Branch Model

The repository uses the following branches:

- `main`  
  Stable, reviewed, release-ready states only.

- `develop`  
  Integration branch for completed documentation or implementation phases.

- `docs/foundation`  
  Documentation-only working branch.

- `agent/implementation`  
  Agent-driven implementation branch.

Direct commits to `main` are forbidden.

---

## Documentation Phase Rules

During documentation:

- All commits happen on `docs/foundation`
- Each document is committed individually
- No code is allowed in this phase
- No rebases after documents are shared

Documentation is merged **once** into `develop`
after the roadmap is fully completed.

---

## Implementation Phase Rules

During implementation:

- All commits happen on `agent/implementation`
- The branch is created from `develop`
- The agent follows the documentation roadmap order

Implementation is blocked until documentation is complete.

---

## Commit Types

### Documentation Commits
Format:
```
docs(<scope>): <description>
```

Examples:
- `docs(core): add glossary`
- `docs(strategy): add strategy lifecycle`

---

### Implementation Commits
Format:
```
feat(<slice>): <capability implemented>
```

Examples:
- `feat(strategy): implement lifecycle state machine`
- `feat(execution): add paper execution plane`

---

### Test Commits
Format:
```
test(<slice>): <tests added>
```

Tests must correspond to documented behavior.

---

### Refactor Commits
Format:
```
refactor(<slice>): <internal restructuring>
```

Refactors:
- must not change behavior
- must reference prior commits

---

## Forbidden Commits

The following are forbidden:

- mixed docs + code
- behavior changes without doc changes
- undocumented refactors
- squash merges hiding intent

---

## Review & Validation

Before merging into `develop`, verify:

- every feature maps to a document
- every document is implemented or intentionally deferred
- all tests pass

---

## Closing Rule

If a change cannot be cleanly expressed
as a single-purpose commit,
the change is too large and must be split.

No exceptions.
