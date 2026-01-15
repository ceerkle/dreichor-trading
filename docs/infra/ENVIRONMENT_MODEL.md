# Environment Model — Phase 1.5 / Phase 2

## Purpose

This document defines the environment model of the Dreichor backend.

It describes:
- which environments exist
- how they differ
- which guarantees apply per environment
- how environment boundaries are enforced

The environment model is explicit, static, and operator-controlled.

---

## Environments Overview

The system defines exactly two environments:

- dev
- prod

Each environment is:
- isolated by configuration
- isolated by deployment
- isolated by Cloudflare Access policy

There is no implicit environment inference.

---

## Environment Selection

The active environment is defined by:

- ENVIRONMENT environment variable

Allowed values:
- dev
- prod

Rules:
- ENVIRONMENT is required
- no default value exists
- invalid values MUST fail startup

---

## Development Environment (dev)

### Purpose

The dev environment is used for:
- testing deployments
- smoke testing
- replay validation
- non-destructive experimentation

It is production-like but intentionally permissive.

---

### Guarantees (dev)

- Deterministic runtime behavior
- Full audit logging
- Same persistence model as prod
- Same replay guarantees as prod

---

### Relaxations (dev only)

The following may be allowed in dev:
- smoke-mode deployments
- frequent restarts
- experimental artifacts

These relaxations MUST NOT affect determinism.

---

## Production Environment (prod)

### Purpose

The prod environment is the authoritative runtime environment.

It represents:
- the canonical audit history
- the canonical shadow ledger
- the source of truth for observability

---

### Guarantees (prod)

- Strict determinism
- Immutable audit history
- No experimental artifacts
- No `latest` tags
- PAPER execution plane enforced

Any violation MUST fail fast.

---

### Restrictions (prod only)

The prod environment MUST enforce:
- EXECUTION_PLANE = paper
- immutable container images
- no mutable configuration at runtime
- no debug or smoke modes

---

## Environment Isolation

Each environment has:

- its own runtime container
- its own persistence volumes
- its own database instance or schema
- its own Cloudflare Access policy
- its own secrets

Cross-environment access is forbidden.

---

## Environment-Specific Configuration

Environment-specific values include:

- database connection strings
- persistence paths
- Cloudflare Access credentials
- deployment endpoints
- logging verbosity

All configuration is injected via environment variables.

---

## Environment Validation

At startup, the runtime MUST validate:

- ENVIRONMENT is set
- environment-specific invariants hold
- forbidden combinations are rejected

Failure MUST abort startup.

---

## Observability Implications

Observer APIs MUST:
- report the active environment
- never aggregate data across environments
- never expose environment-internal secrets

UI consumers MUST treat environments as separate systems.

---

## Non-Goals

This environment model does NOT include:
- staging environments
- preview environments
- per-branch environments
- ephemeral environments
- dynamic environment creation

Such extensions require a new phase.

---

## Phase Constraint

The environment model is frozen for Phase 2.

Any change requires:
- explicit documentation update
- review of determinism impact
- operator approval

---

## Closing Rule

Environments exist to enforce discipline.

They are not conveniences, but boundaries.