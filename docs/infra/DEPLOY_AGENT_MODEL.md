# Deploy Agent Model — v1 (Phase 1.7)

## Purpose

This document defines the Deploy Agent contract used for manual,
GitHub-Actions–triggered deployments in Phase 1.7.

The Deploy Agent is the only allowed mechanism to start or stop the runtime
on the server.

No SSH.
No direct Docker access from CI.
No implicit behavior.

---

## Environments

Two environments exist and are strictly separated.

Environment: dev
Host: https://dev.dreichor.io

Environment: prod
Host: https://app.dreichor.io

Each environment has its own Cloudflare Tunnel, Access policy, and secrets.

---

## Endpoint Specification

Base URL:
- Environment-specific host (see above)

Paths:
- POST /v1/deploy
- GET  /v1/status

No other endpoints are used in Phase 1.7.

---

## Authentication (Cloudflare Access)

Mechanism:
- Cloudflare Access Service Tokens

Required Headers (exact):
- CF-Access-Client-Id
- CF-Access-Client-Secret
- Content-Type: application/json

No bearer tokens.
No SSH.
No mTLS.

---

## GitHub Environment Secrets (exact names)

Defined separately for GitHub Environments dev and prod.

Required:
- DEPLOY_ENDPOINT
- CF_ACCESS_CLIENT_ID
- CF_ACCESS_CLIENT_SECRET
- DATABASE_URL

Rules:
- Missing secret MUST cause workflow failure
- No defaults are allowed
- Secrets are injected only at deploy time

---

## Deploy API Contract

### POST /v1/deploy

Request JSON:

{
  container_name: "dreichor-runtime",
  image: "ghcr.io/<owner>/<repo>/runtime:<tag>",
  environment: "dev" | "prod",
  env: {
    DATABASE_URL: "...",
    EXECUTION_PLANE: "paper"
  },
  volumes: {
    dreichor-audit-events: "/var/lib/dreichor/audit-events",
    dreichor-snapshots: "/var/lib/dreichor/snapshots"
  }
}

Semantics (atomic, server-side):

1. docker pull <image>
2. stop container dreichor-runtime if it exists
3. remove container dreichor-runtime if it exists
4. docker run with:
   - fixed container name
   - provided environment variables
   - provided volume mappings
5. return success only if container starts successfully

No retries.
No partial execution.

---

### Success Response

HTTP 200

{
  status: "deployed",
  container_name: "dreichor-runtime",
  image: "<image>",
  environment: "<env>"
}

---

### Failure Response

HTTP 4xx or 5xx

{
  status: "error",
  reason: "<human readable explanation>"
}

Any non-200 response MUST be treated as a hard failure by CI.

---

## Status API

### GET /v1/status

Response:

{
  running: true | false,
  container_name: "dreichor-runtime",
  image: "<image>",
  started_at: "<iso timestamp>"
}

Used by CI only for verification, never for control.

---

## Runtime Container Contract

Container Name:
- dreichor-runtime

Volumes (named, pre-existing):

- dreichor-audit-events -> /var/lib/dreichor/audit-events
- dreichor-snapshots    -> /var/lib/dreichor/snapshots

Rules:
- Volumes are not created by the workflow
- Volumes are never deleted by the workflow

---

## Database

- Postgres is externally managed
- Only DATABASE_URL is passed
- No migrations
- No schema checks

---

## CI / Workflow Scope

The deploy workflow MAY:
- be triggered via workflow_dispatch
- accept inputs: environment and image_tag
- call the Deploy Agent
- verify container status
- log responses

The workflow MUST NOT:
- access Docker directly
- use SSH
- deploy automatically on push
- infer defaults

---

## Closing Rule

Any change to endpoints, authentication, container semantics,
or volume mappings requires:
- updating this document
- explicit review

Deployment must remain boring, explicit, and auditable.