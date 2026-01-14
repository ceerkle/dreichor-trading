# Database Migration Model (Phase 1.5)

## Purpose

This document defines how **database schema migrations** are handled in Phase 1.5.

The goal is to ensure that:
- database structure is explicit
- schema evolution is deterministic
- runtime behavior is never coupled to migration logic

Migrations exist to support **auditability, replayability, and safety**.

---

## Core Principles

- Migrations are explicit and reviewable
- Migrations are executed manually
- Runtime NEVER performs schema changes
- Schema state is a precondition for runtime startup

---

## Separation of Responsibilities

### Runtime

The runtime:
- reads from the database
- writes audit events and snapshots
- assumes the schema is already correct
- MUST NOT execute migrations
- MUST NOT create or alter tables
- MUST fail startup if schema is incompatible

The runtime treats the database as a fixed contract.

---

### Migration Process

Migrations:
- are executed by an operator
- run before the runtime is started
- are not triggered automatically
- are not retried implicitly

Migrations and runtime MUST NEVER be the same process.

---

## Migration Source

All migrations live in:

infra/migrations/

Rules:
- migrations are plain SQL files
- filenames are strictly ordered and monotonic
- no branching or conditional migrations are allowed

Example naming:
- 001_init.sql
- 002_add_shadow_ledger.sql
- 003_add_decision_memory.sql

Order is defined by filename sorting.

---

## Migration Semantics

Each migration:
- is applied exactly once
- mutates schema forward only
- MUST be idempotent at the database level where possible
- MUST NOT depend on runtime data

Migrations MUST NOT:
- read or modify audit events
- transform historical data
- introduce derived state

---

## Version Tracking

The database MUST track applied migrations explicitly.

Rules:
- a migrations table records applied filenames
- runtime MAY read this table for compatibility checks
- runtime MUST NOT modify this table

Migration state is part of operational responsibility.

---

## Failure Handling

If a migration fails:
- the migration process MUST stop immediately
- the runtime MUST NOT be started
- the operator MUST resolve the issue manually

There is:
- no automatic rollback
- no retry logic
- no fallback schema

Failure is explicit and blocking.

---

## Determinism & Replay

Schema changes:
- MUST NOT affect historical replay semantics
- MUST preserve audit log interpretability
- MUST NOT change meaning of existing fields

If a schema change would alter replay semantics:
- it MUST be rejected
- or requires a new Phase / version

---

## Environment Constraints

Database connection details:
- are provided via environment variables
- are defined in infra/.env.schema.md
- MUST be present before migration or runtime start

Missing or invalid configuration MUST fail fast.

---

## Non-Goals (Phase 1.5)

This migration model does NOT include:
- automatic migration tooling
- runtime-driven schema evolution
- rollback or downgrade support
- multi-database coordination
- online migrations
- zero-downtime guarantees

---

## Review & Change Policy

Any change to:
- migration rules
- execution responsibility
- schema compatibility guarantees

requires:
- update to this document
- explicit review
- operator agreement

---

## Closing Rule

Database migrations are operational acts.

They MUST remain:
- explicit
- deterministic
- boring
- reviewable

No implicit schema behavior is allowed.