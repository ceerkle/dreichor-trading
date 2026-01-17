# Infrastructure Skeleton — Phase 1.5 (Normative)

## Purpose

This document defines the **infrastructure skeleton** for Phase 1.5.

It specifies:
- where infrastructure-related concerns live
- which responsibilities exist
- which boundaries MUST NOT be crossed

This document is **normative**.
Implementation must follow this structure and these constraints.

No tooling, commands, or concrete configuration files are defined here.

---

## Scope (Phase 1.5)

Phase 1.5 has one goal:

> Make the system **infra-ready and production-shapable**
> without overengineering or premature optimization.

This phase prepares the system to:
- run as containers on a single server (Hetzner)
- persist audit data and snapshots
- be started, stopped, and replayed deterministically

---

## Top-Level Infrastructure Structure

All infrastructure-related artifacts MUST live under `/infra`.

```text
infra/
├── README.md                    # This document (entry point)
│
├── docker/
│   ├── Dockerfile.runtime       # Trading runtime (Node.js, prod)
│   ├── Dockerfile.migrations    # Database migrations (one-shot)
│   └── Dockerfile.dev           # Optional local development image
│
├── compose/
│   ├── docker-compose.dev.yml   # Local development only
│   └── docker-compose.prod.yml  # Hetzner single-node deployment
│
├── env/
│   ├── .env.schema.md           # (planned) env contract location
│   ├── .env.example             # Safe, non-secret example
│   └── README.md                # Env rules & forbidden patterns
│
├── db/
│   ├── migrations/              # Versioned SQL migrations only
│   ├── README.md                # DB ownership & replay rules
│   └── schema.md                # Logical DB model (no SQL)
│
├── ci/
│   ├── github-actions.md        # CI behavior (descriptive)
│   └── release-process.md       # Tagging & image promotion
│
├── runtime/
│   ├── STARTUP_CONTRACT.md      # Deterministic startup semantics
│   ├── SHUTDOWN_CONTRACT.md     # Deterministic shutdown semantics
│   └── HEALTH_MODEL.md          # Liveness & readiness meaning
│
└── deploy/
    ├── HETZNER_MODEL.md         # Server & volume model
    ├── SECRETS_MODEL.md         # How secrets enter the system
    └── ROLLBACK_STRATEGY.md     # How to revert safely
```


## Core Infrastructure Principles

### 1. Single Node, Single Runtime

Phase 1.5 operates on:
- exactly one server
- exactly one runtime instance
- exactly one database

High availability and orchestration are explicitly out of scope.

---

### 2. Runtime Is Ephemeral

The runtime container MUST:
- contain no persistent state
- be safely restartable at any time

All durable state MUST live in:
- audit events
- snapshots
- database storage

A restart MUST be equivalent to a replay.

---

### 3. Audit-First Persistence

Persistence is governed by these rules:
- audit events are append-only
- snapshots are derived, non-authoritative optimizations
- the database is the source of replay truth

If persistence is unavailable, the runtime MUST NOT start.

---

### 4. Environment Configuration Is Explicit

All runtime configuration MUST be provided via environment variables.

Rules:
- `docs/infra/ENV_SCHEMA.md` is the single source of truth (authoritative env contract)
- no implicit defaults are allowed
- missing required variables MUST cause startup failure
- secrets MUST NOT be committed

---

### 5. CI Builds, Humans Deploy

Continuous Integration:
- runs tests
- builds container images
- produces tagged artifacts

Continuous Deployment is explicitly excluded in Phase 1.5.

Deployment to Hetzner is manual and review-driven.

---

## Non-Goals (Phase 1.5)

This infrastructure skeleton does NOT include:
- Kubernetes
- multi-node setups
- autoscaling
- secret managers
- live exchange credentials
- UI, reverse proxies, or ingress
- background workers or schedulers

---

## Outcome of This Skeleton

After this document is implemented:
- the system can be containerized safely
- runtime lifecycle is explicit and testable
- persistence boundaries are clear
- future production hardening is possible without refactoring core logic

---

## Closing Rule

Any change to infrastructure structure or responsibilities requires:
- an update to this document
- explicit review
- agreement before implementation

Infrastructure MUST remain boring, explicit, and auditable.