# Runtime Environment Model

## Purpose

This document defines the **authoritative runtime environment model**
for the Dreichor Trading Runtime.

It specifies:
- which environment variables are **required**
- where they are defined (server vs deployment)
- how DEV and PROD are separated
- which values are immutable at runtime
- which components are allowed to read or enforce them

This document is **normative**.
If code, workflows, or deploy scripts disagree with this document,
**this document wins**.

---

## Environments

The system operates in two strictly separated environments:

- `dev`
- `prod`

Each environment has:
- its own database
- its own persistence directories
- its own runtime container
- its own deploy agent instance
- its own Cloudflare Access policy

**DEV and PROD MUST NEVER share state.**

---

## Runtime Configuration Source of Truth

### Rule (Hard)

> The runtime environment is defined **out-of-band** (per environment) and must be stable and reviewable.

GitHub Actions:
- select **which image** to deploy
- select **which environment** (dev / prod)
- transport the already-defined per-environment runtime configuration to the Deploy Agent
- MUST NOT carry ad-hoc, per-run runtime behavior decisions

Where the runtime configuration lives (current Phase 1.5 / 2 setup):
- GitHub Environments (recommended): `secrets.*` + `vars.*` per environment, injected by `.github/workflows/deploy.yml`
- (Alternatively) server-side configuration if the Deploy Agent is extended to inject server-owned runtime env in the future

---

## Required Runtime Environment Variables

These variables are **required** for the runtime container to start.
Missing or invalid values MUST cause startup failure.

### Identity & Determinism

| Variable | Description |
|--------|------------|
| `RUNTIME_INSTANCE_ID` | Stable identifier for this runtime instance |
| `LOGICAL_TIME_SOURCE` | Logical time mode (e.g. `monotonic`) |

---

### Execution & Safety

| Variable | Description |
|--------|------------|
| `EXECUTION_PLANE` | Execution plane (`paper` in Phase 1.x / 2) |
| `EXCHANGE_PROVIDER` | Exchange adapter identifier |
| `SAFETY_MODE` | Safety mode (`strict`, etc.) |

> In Phase 1.5 / Phase 2, execution is **paper-only**.

---

### Persistence & Storage

| Variable | Description |
|--------|------------|
| `PERSISTENCE_MODE` | Persistence backend (e.g. `filesystem`) |
| `SNAPSHOT_STRATEGY` | Snapshot strategy identifier |
| `ENABLE_AUDIT_LOGGING` | Must be explicitly set (`true` / `false`) |

---

### Database

| Variable | Description |
|--------|------------|
| `DATABASE_URL` | PostgreSQL connection string (must start with `postgres://`) |

Each environment uses its **own database**.

---

### Logging

| Variable | Description |
|--------|------------|
| `LOG_LEVEL` | Log verbosity (`info`, `warn`, `error`, etc.) |

---

## Environment Ownership

### Environment-Owned (Immutable per Environment)

These variables MUST be stable per environment and MUST NOT be changed implicitly by CI logic.

In the current implementation, they are injected into the runtime container via the Deploy Agent request `env`
(typically sourced from GitHub Environment secrets/vars).

- `RUNTIME_INSTANCE_ID`
- `LOGICAL_TIME_SOURCE`
- `EXECUTION_PLANE`
- `EXCHANGE_PROVIDER`
- `SAFETY_MODE`
- `PERSISTENCE_MODE`
- `SNAPSHOT_STRATEGY`
- `ENABLE_AUDIT_LOGGING`
- `DATABASE_URL`
- `LOG_LEVEL`

---

### Deploy-Time Inputs (Allowed)

The deploy agent accepts:
- image reference (immutable tag) (required)
- `env` object (optional) which is passed through to Docker as `-e KEY="VALUE"` (runtime-critical)
- environment label (`dev` / `prod`) (optional, informational only)

Implementation note (current):
- The deploy agent does not validate runtime env semantics; it passes variables through.
- If runtime-critical variables are missing/invalid, the runtime will fail fast on startup.

---

## Validation Rules

### Runtime Startup

On startup:
1. All required variables MUST be present
2. All values MUST pass strict validation
3. Any violation MUST abort startup immediately

No defaults.
No inference.
No silent fallback.

---

### Deployment

A deployment that results in a runtime crash due to invalid env
is considered a **failed deployment**.

Why this often shows up as a restart loop:
- The deploy agent starts the container with `--restart unless-stopped`.
- The runtime performs strict env + persistence validation and exits with a non-zero code on any violation.
- Docker immediately restarts the container, producing repeated crash logs until configuration is fixed or the container is removed.

---

## DEV vs PROD Differences

| Aspect | DEV | PROD |
|-----|-----|------|
| Execution plane | paper | paper |
| Database | dreichor_dev | dreichor_prod |
| Persistence paths | `/opt/dreichor/dev/...` | `/opt/dreichor/prod/...` |
| Deploy agent port | (server-defined) | (server-defined) |

---

## Explicit Non-Goals

- No dynamic runtime reconfiguration
- No environment mutation via API
- No ad-hoc per-run runtime secret injection outside the selected environment
- No shared runtime containers

---

## Rationale

This model guarantees:
- deterministic startup
- auditability
- reproducibility
- safe evolution toward live execution in later phases

It also prevents:
- accidental PROD misconfiguration
- runtime drift
- hidden behavior changes during deploy

---

## Status

- Phase: 1.5 / 2 compatible
- Live Execution: **NOT ENABLED**
- Mutability: **Environment-owned only**
