# Deploy Agent Model (Authoritative Contract)

## Purpose

This document defines the **authoritative Deploy Agent contract** for the Dreichor system.

**Source of truth:** the running server-side `agent.js` implementation.
If this document and the running `agent.js` ever disagree, **the running `agent.js` wins**
and this document MUST be updated to remove drift.

The deploy agent is the only allowed control plane component that may:
- start runtime containers
- stop runtime containers
- replace runtime containers during deployment

There is no SSH-based deployment.
There is no direct Docker access from CI.
There is no implicit or automatic behavior.

If workflows, scripts, or assumptions disagree with this document, this document wins.

---

## Environments

Two environments exist and are strictly separated:

- dev
- prod

Each environment has:
- its own deploy agent process
- its own Cloudflare Tunnel
- its own Cloudflare Access policy
- its own runtime container
- its own persistence directories
- its own database

DEV and PROD must never share containers or state.

---

## Deploy Agent Instances

Each environment runs exactly one deploy agent as a long-running Node.js process.

DEV deploy agent:
- path: /opt/dreichor/dev/deploy-agent/agent.js
- bind address: 127.0.0.1
- port: server-defined via `PORT` (commonly 3005)

PROD deploy agent:
- path: /opt/dreichor/prod/deploy-agent/agent.js
- bind address: 127.0.0.1
- port: server-defined via `PORT`

Deploy agents are managed via systemd and are not containerized.

---

## Network & Access Model

Deploy agents are never exposed directly to the public internet.

All access is mediated by:
- Cloudflare Tunnel
- Cloudflare Access Service Tokens

The deploy agent trusts requests only if they arrive through Cloudflare.

---

## Authentication

Authentication is enforced via Cloudflare Access Service Tokens.

Cloudflare Access Service Tokens are enforced at the Cloudflare edge.

In-process guard (Deploy Agent):
- the Deploy Agent only verifies the request arrived via Cloudflare by requiring the `cf-ray` header.

No bearer tokens.
No SSH.
No mTLS.

---

## Runtime Container Ownership

The deploy agent is the single owner of runtime container lifecycle.

For each environment, exactly one runtime container exists.

Container naming is **server-owned** via the Deploy Agent environment variable:
- `CONTAINER_NAME` (required)

Rule (hard):
- DEV and PROD container names MUST NOT collide.

Recommended convention:
- dev: `dreichor-runtime-dev`
- prod: `dreichor-runtime-prod`

---

## Runtime Image Policy

Runtime images are pulled from GitHub Container Registry.

Image reference format:
- ghcr.io/ceerkle/dreichor-trading/runtime:<immutable-tag>

Rules:
- Tags must be immutable
- The latest tag is forbidden in production
- The deploy agent does not infer or modify image tags

---

## Deploy API

### POST /v1/deploy

Purpose:
Deploy or replace the runtime container for the target environment.

Request body:
- `image` (string, required): runtime image reference (`ghcr.io/<owner>/<repo>/runtime:<tag>`)
- `env` (object, optional): environment variables injected into the runtime container
- `environment` (string, optional): informational only (echoed back in the response; not used for routing)

Fields that are ignored (presently) and MUST NOT be relied on:
- `container_name` (the server uses `CONTAINER_NAME`)
- `volumes` (the server uses `AUDIT_EVENTS_PATH` and `SNAPSHOTS_PATH`)

No client-side mechanism is allowed to override server-owned values.

---

### Deploy Semantics

Deploy execution is atomic and server-controlled:

1. Pull the requested image
2. Stop the existing runtime container if present
3. Remove the existing runtime container if present
4. Start a new container with:
   - server-owned container name (`CONTAINER_NAME`)
   - server-owned volume mounts (`AUDIT_EVENTS_PATH`, `SNAPSHOTS_PATH`)
   - runtime environment variables injected from the request body `env` (if provided)
5. Return success only if the container starts successfully

There are:
- no retries
- no partial execution
- no fallback behavior

---

### Deploy Success Response

HTTP 200

Response fields:
- status: deployed
- container_name
- image
- environment (echoed from request, if provided)

---

### Deploy Failure Response

HTTP 4xx or 5xx

Response fields:
- status: error
- reason: human-readable explanation

Any non-200 response must be treated as a hard failure by CI.

---

## Status API

### GET /v1/status

Purpose:
Expose runtime container status for verification.

Response fields:
- container_name
- running (true or false)
- image (if running)
- started_at (ISO timestamp, if running)

This endpoint is read-only and must never trigger side effects.

---

## Stop API

### POST /v1/stop

Purpose:
Stop and remove the runtime container deterministically.

Semantics:
- if the container exists, it is stopped and removed
- if the container does not exist, the operation is a no-op
- after completion, no runtime container must be running

Response:
- status: stopped
- container_name

Used only for smoke deployments or manual shutdowns.

---

## Environment Variables (Deploy Agent)

Deploy agent environment variables are defined in server-side .env files.

The deploy agent owns:
- CONTAINER_NAME
- AUDIT_EVENTS_PATH
- SNAPSHOTS_PATH
- ALLOW_EXECUTION_PLANE
- PORT
- ENVIRONMENT

These values must not be overridden by deploy requests.

---

## Runtime Environment Injection

The Deploy Agent can inject runtime environment variables via the `env` object in the deploy request.

Current implementation notes:
- The Deploy Agent does NOT merge in additional server-side runtime variables automatically.
- The Deploy Agent does NOT validate runtime env semantics; it passes key/value pairs through to Docker.
- `ALLOW_EXECUTION_PLANE` is currently logged at startup but not enforced by the Deploy Agent.

Operational rule:
- Treat runtime env injection as **runtime-critical**. Missing or invalid variables will crash the container and trigger Docker restart loops (`--restart unless-stopped`).

---

## Database Interaction

The deploy agent does not:
- manage the database
- run migrations
- validate schemas
- validate database connectivity

It only starts/stops the runtime container. Database correctness is verified by the runtime during startup (fail-fast).

---

## CI / Workflow Responsibilities

CI workflows may:
- select an image tag
- select a target environment
- trigger deploy via the deploy agent
- verify status

CI workflows must not:
- access Docker
- use SSH
- inject runtime configuration
- perform migrations

---

## Change Policy

Any change to:
- deploy endpoints
- authentication
- container semantics
- environment ownership

requires:
- updating this document
- explicit review

Deployment must remain boring, explicit, and auditable.

---

## Status

- Applies to Phase 1.5 and Phase 2
- Compatible with the current deploy agent implementation
- Required foundation for future controlled execution phases