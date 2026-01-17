# Database Setup & Migration Model

## Purpose

This document defines the authoritative database setup for the Dreichor system.

It specifies:
- how PostgreSQL is provisioned
- how DEV and PROD are separated
- how schema evolution is handled
- how data persistence is guaranteed across deployments
- how hard resets are performed intentionally

If code, workflows, or assumptions disagree with this document, this document wins.

---

## Database Architecture

### PostgreSQL as Host Service

PostgreSQL runs as a system-level service on the server.

It is:
- not containerized
- not managed by the deploy agent
- managed by the operator via system packages and systemd
- backed by host-level storage

This guarantees:
- stability across runtime deployments
- an independent lifecycle from application containers
- compatibility with external tooling such as psql, backups, and Grafana

---

## Environment Separation

A single PostgreSQL instance hosts two isolated databases:

- dev → dreichor_dev
- prod → dreichor_prod

Rules:
- no shared schemas
- no cross-database access
- credentials are environment-specific

---

## Database Access

The runtime accesses the database via the DATABASE_URL environment variable.

Rules:
- the URL must start with postgres://
- it must point to localhost
- it must reference the correct environment database

The runtime validates the URL strictly and fails fast on invalid configuration.

---

## Schema Migration Model

### Authoritative Location

All database migrations live in the repository under infra/db/migrations/.

---

### Migration Rules (Hard)

- only plain SQL files are allowed
- filenames define execution order via lexicographic sorting
- filenames must be monotonic and append-only
- existing migration files must never be edited

Example naming pattern:
- 001_init.sql
- 002_add_shadow_ledger.sql
- 003_add_decision_memory.sql

---

### Migration Tracking

Applied migrations are tracked in the database table public.dreichor_schema_migrations.

The table contains:
- version (primary key, text)
- applied_at (timestamp with timezone)

---

## Migration Execution

### Execution Mode

Migrations are executed manually by an operator using a one-shot migration runner.

The runtime:
- must not auto-migrate
- must not create or alter schemas
- must fail if the schema is incompatible

---

### Migration Runner

The canonical migration runner is infra/db/migrate.sh.

Its responsibilities are:
- validating DATABASE_URL
- creating the migration tracking table if missing
- applying pending migrations in deterministic order
- recording applied versions

---

### When Migrations Run

Migrations run:
- before deploying a runtime version that requires schema changes
- explicitly, with operator intent

Migrations do not run:
- automatically during deployment
- inside GitHub Actions
- during runtime startup

---

## Deployment Interaction

Runtime deployments assume that the database schema is already compatible.

Deployments:
- do not modify the database
- do not run migrations
- fail fast if the schema is incompatible

This guarantees predictable startup behavior and safe rollback.

---

## Data Persistence Guarantees

As long as the database is not explicitly dropped:
- data survives container restarts
- data survives runtime upgrades
- data survives UI deployments

Persistence is independent of the runtime container lifecycle.

---

## Hard Reset (Intentional Destruction)

A hard reset is the only allowed way to destroy data.

A hard reset consists of:
1. stopping the runtime container
2. dropping the database for the target environment
3. recreating the database
4. re-running migrations from scratch

Hard resets:
- must be manual
- must be intentional
- must never be automated

---

## Backups & Observability (Future)

This setup supports:
- database backups via pg_dump
- point-in-time recovery
- integration with monitoring and observability tooling

These are out of scope for Phase 1.5 and Phase 2, but explicitly supported by design.

---

## Non-Goals

- no runtime-managed migrations
- no schema changes via API
- no migrations executed via GitHub Actions
- no shared DEV and PROD database

---

## Status

- applies to Phase 1.5 and Phase 2
- required for future live execution phases
- compatible with the current deploy-agent model