# Manual Deploy Model — Phase 1.7

## Purpose

This document defines **how the runtime is deployed manually via GitHub Actions**
to a single server.

Deployment is **explicit**, **review-driven**, and **operator-controlled**.

No automatic deployment is allowed.

---

## Core Principles

- Deployment is a **manual action**
- CI builds artifacts; humans deploy them
- No deployment happens without explicit approval
- No hidden side effects
- No server-side tinkering required

---

## Deployment Actor

- There is exactly **one operator**
- All deploy actions are triggered via **GitHub Actions**
- The operator does **not** log into the server manually for normal deploys

---

## Artifact Source

- Runtime images are built by CI
- Images are stored in **GitHub Container Registry (GHCR)**

Image naming convention:

- Repository: `ghcr.io/<owner>/<repo>/runtime`
- Tags:
  - immutable commit SHA
  - immutable version tag (e.g. `1.0.3` or `1.0.3-dev`)

Only these images may be deployed.

---

## Deployment Trigger

Deployment is triggered via:

- `workflow_dispatch` (manual GitHub Action trigger)

The operator must explicitly select:
- environment: `dev` or `prod`
- image tag (SHA or semantic)

No automatic triggers are allowed.

---

## Environment Separation

Two environments exist:

### dev
- non-critical
- used for validation
- may be restarted freely

### prod
- safety-critical
- requires extra confirmation
- no automatic rollback

GitHub Environments MUST be used:
- `dev`
- `prod`

Each environment has its own secrets.

---

## Configuration Injection

All runtime configuration is injected via **environment variables**.

Rules:
- No config files inside the container
- No defaults in code
- Missing config MUST fail startup

Secrets are provided via:
- GitHub Secrets
- mapped into the workflow

The authoritative list is:
- `infra/ENV_SCHEMA.md`

---

## Connectivity Model

- The runtime runs on a single server
- Connectivity is provided via **Cloudflare Tunnel**
- The GitHub Action does NOT expose ports directly
- The runtime is not publicly reachable without the tunnel

Tunnel configuration is assumed to exist already.

---

## Deployment Mechanism

Deployment performs exactly these steps:

1. Operator triggers the GitHub Action deploy workflow (`workflow_dispatch`)
2. GitHub Actions calls the Deploy Agent API (behind Cloudflare Access)
3. Deploy Agent pulls the selected image
4. Deploy Agent stops/removes the existing runtime container (if present)
5. Deploy Agent starts the new container with:
   - server-owned container name
   - server-owned volume mounts
   - runtime env variables injected via the deploy request (current implementation)
6. GitHub Actions verifies container status via `GET /v1/status`
7. Exit

No rolling updates.
No parallel containers.
No retries.

---

## Failure Handling

If deployment fails:
- the runtime MUST NOT start
- no automatic rollback occurs
- operator must investigate and retry manually

State consistency is preserved via audit replay.

---

## Observability

The deployment MUST surface:
- container start logs
- startup phase logs
- explicit error messages on failure

Metrics and dashboards are optional.

---

## Non-Goals (Phase 1.7)

This deployment model does NOT include:
- Kubernetes
- autoscaling
- blue/green or canary deployments
- secret rotation
- live exchange credentials
- UI deployment

---

## Closing Rule

Any change to deployment behavior requires:
- update to this document
- explicit review
- operator approval

Deployment MUST remain boring, explicit, and auditable.