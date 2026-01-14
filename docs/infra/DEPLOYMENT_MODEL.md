# Deployment Model (Phase 1.5)

This document defines **how and where the system is deployed**
during Phase 1.5.

It explicitly describes what is automated, what is manual,
and what is intentionally out of scope.

---

## Purpose

The Deployment Model ensures that:

- deployment is predictable and reviewable
- production behavior is understandable
- no hidden automation exists
- operational responsibility is explicit

This phase prioritizes **control over convenience**.

---

## Target Environment

Phase 1.5 runs on:

- a single Hetzner server
- a Linux host (amd64)
- Docker as the only runtime dependency

There is exactly:
- one runtime container
- one database instance
- one operator-controlled environment

High availability is out of scope.

---

## Deployment Topology

```text
Hetzner Server
├── Docker
│   ├── runtime container
│   └── database container (or managed DB)
└── Persistent Volume
    ├── audit events
    └── snapshots
```

Notes:
- Containers may be restarted at any time
- Persistent volumes MUST survive restarts
- No container-local persistence is allowed

---

## Build Model

### Continuous Integration (CI)

CI is responsible for:
- running the full test suite
- building container images
- tagging artifacts

CI MUST NOT:
- deploy to production
- mutate runtime state
- access secrets

CI outputs immutable artifacts.

---

## Artifact Tagging

Artifacts MUST be tagged with:
- git commit SHA
- semantic tag (e.g. core-runtime-v1)

Tags MUST be immutable once published.

---

## Deployment Process (Manual)

Deployment is performed manually by an operator.

Steps:
1. Review changes (code + docs)
2. Select an artifact version
3. Pull container image
4. Update environment variables
5. Restart runtime container

Rules:
- no auto-deploy
- no rolling updates
- no partial rollout

Every deployment is a deliberate action.

---

## Configuration Injection

All configuration is injected via environment variables.

Rules:
- no config files inside containers
- no defaults in code
- missing config MUST fail startup

The authoritative list is:
- infra/.env.schema.md

---

## Secrets Handling

Phase 1.5 secrets:
- are stored outside the repository
- are injected at runtime
- are never logged

Allowed mechanisms:
- .env file on server
- environment variables set by operator

Secret managers are out of scope.

---

## Database & Migrations

Database setup rules:
- schema migrations are explicit
- migrations are reviewed
- migrations run before runtime start

The runtime MUST NOT auto-migrate.

---

## Failure Handling

If deployment fails:
- runtime MUST NOT start
- operator must fix the issue
- no automatic rollback occurs

State consistency is preserved via audit replay.

---

## Observability

Deployment MUST provide:
- container logs
- startup phase logs
- clear failure reasons

Metrics and dashboards are optional.

---

## Non-Goals (Phase 1.5)

This deployment model does NOT include:
- Kubernetes
- autoscaling
- blue/green deployments
- canary releases
- secret rotation
- multi-environment promotion

---

## Outcome of Phase 1.5 Deployment

After this model is implemented:
- the system can run safely on a single server
- restarts are deterministic
- operational risk is explicit
- future automation is possible without refactoring

---

## Closing Rule

Any change to deployment behavior requires:
- update to this document
- explicit review
- operator approval

Deployment MUST remain boring, explicit, and auditable.