# Deploy Agent Model

## Purpose

This document defines the authoritative deploy agent model for the Dreichor system.

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
- port: 3005

PROD deploy agent:
- path: /opt/dreichor/prod/deploy-agent/agent.js
- bind address: 127.0.0.1
- port: 3006

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

Required request headers:
- CF-Access-Client-Id
- CF-Access-Client-Secret
- Content-Type: application/json

Requests missing these headers must be rejected.

No bearer tokens.
No SSH.
No mTLS.

---

## Runtime Container Ownership

The deploy agent is the single owner of runtime container lifecycle.

For each environment, exactly one runtime container exists.

Container naming is environment-specific:

- dev: dreichor-runtime-dev
- prod: dreichor-runtime-prod

Container names must never collide across environments.

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
- image: runtime image reference (required)
- environment: dev or prod (informational only)

The deploy agent does not accept:
- container name overrides
- volume overrides
- runtime behavior overrides

---

### Deploy Semantics

Deploy execution is atomic and server-controlled:

1. Pull the requested image
2. Stop the existing runtime container if present
3. Remove the existing runtime container if present
4. Start a new container with:
   - fixed container name (environment-specific)
   - fixed volume mounts
   - server-defined environment variables
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
- environment

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

The deploy agent injects runtime environment variables that are:
- defined server-side
- immutable per environment

GitHub Actions must not inject runtime behavior variables such as:
- DATABASE_URL
- EXECUTION_PLANE
- SAFETY_MODE
- LOG_LEVEL

These are server-owned.

---

## Database Interaction

The deploy agent does not:
- manage the database
- run migrations
- validate schemas

It only ensures that the runtime container receives the correct DATABASE_URL.

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
- Compatible with current deploy agent implementation
- Required foundation for future controlled execution phases