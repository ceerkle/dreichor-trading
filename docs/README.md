# Documentation Overview

This directory contains **all authoritative documentation** for the system.

Documentation is written **before** implementation
and defines the complete behavior, structure, and constraints of the system.

Nothing outside this directory is considered normative.

---

## Structure

```
/docs
  /manifest      → Core philosophy and behavioral contracts
  /architecture  → System structure and invariants
  /adr           → Architecture Decision Records (immutable decisions)
  /core          → Core definitions and domain language
  /strategy      → Strategy and decision semantics
  /execution     → Execution, safety, and reality handling
  /memory        → Decision memory and feedback
  /persistence   → Audit and storage rules
  /meta          → Orchestration and control layer
  /agent         → Agent execution and git strategy
```

Not all directories may exist yet.
They are created as documents are finalized.

---

## Documentation Roadmap

The file `DOCUMENTATION_ROADMAP.md` defines:
- which documents must exist
- in which order they are written
- when implementation may begin

This roadmap is binding.

---

## Rules

- Documents are **final**, not drafts.
- Changes require explicit decisions (ADR or version bump).
- Implementation must follow documentation verbatim.

---

## Intended Audience

- System designers
- Auditors
- Contributors
- Automated coding agents

If something is unclear to a reader,
it is considered incomplete.

---

## Implementation Notice

No code should be added while documentation is incomplete.
The agent implementation phase begins only after
the roadmap is fully satisfied.
