# GitHub Environments & Secrets — v1 (Phase 1.7)

## Purpose

This document defines the **authoritative configuration of GitHub Environments**
used for manual deployments in Phase 1.7.

It answers exactly one question:

> Which secrets exist, where do they live, and when must a deployment fail?

This document is normative for:
- `.github/workflows/deploy.yml`
- Manual operator workflows
- Phase 1.7 deployment safety

---

## Environments (Strict)

Exactly two GitHub Environments exist:

- dev
- prod

Rules:
- Environments are strictly isolated
- Secrets MUST NOT be shared between environments
- Deployments always target exactly one environment
- No implicit fallback between environments is allowed

---

## Environment: dev

Purpose:
- Paper execution
- Validation of runtime behavior
- No capital at risk

Host:
- https://dev.dreichor.io

Execution Plane:
- paper only

---

## Environment: prod

Purpose:
- Production observation
- Paper execution only (Phase 1.7)
- Preparation for future live trading

Host:
- https://app.dreichor.io

Execution Plane:
- paper only

Live execution is explicitly forbidden in Phase 1.7.

---

## Required Secrets (Exact Names)

Each GitHub Environment (dev, prod) MUST define the following secrets.

### DEPLOY_ENDPOINT

Description:
- Base URL of the Deploy Agent
- Environment-specific (dev vs prod)

Examples:
- dev: https://dev.dreichor.io
- prod: https://app.dreichor.io

Failure Rule:
- Missing → hard fail before deploy

---

### CF_ACCESS_CLIENT_ID

Description:
- Cloudflare Access Service Token Client ID
- Used for Deploy Agent authentication

Failure Rule:
- Missing → hard fail before deploy

---

### CF_ACCESS_CLIENT_SECRET

Description:
- Cloudflare Access Service Token Client Secret
- Used for Deploy Agent authentication

Failure Rule:
- Missing → hard fail before deploy

---

### DATABASE_URL

Description:
- PostgreSQL connection string for the runtime
- Injected into the runtime container
- Used only by the runtime

Rules:
- Must be environment-specific
- Must point to an existing, migrated database

Failure Rule:
- Missing → hard fail before deploy

---

## Required Variables (Non-Secret, Exact Names)

Each GitHub Environment (dev, prod) MUST define the following **variables** (not secrets).
They are injected into the runtime container via the Deploy Agent request `env`.

### NODE_ENV

Allowed:
- production | staging | development

Recommended:
- dev: `production`
- prod: `production`

Failure Rule:
- Missing → hard fail before deploy

---

### RUNTIME_INSTANCE_ID

Description:
- Stable identifier for this runtime instance
- MUST be stable across restarts within an environment

Failure Rule:
- Missing → hard fail before deploy

---

### LOGICAL_TIME_SOURCE

Allowed:
- marketdata | manual

Recommended:
- dev: `marketdata`
- prod: `marketdata`

Failure Rule:
- Missing → hard fail before deploy

---

### PERSISTENCE_MODE

Allowed:
- postgres

Failure Rule:
- Missing → hard fail before deploy

---

### SNAPSHOT_STRATEGY

Allowed:
- on-ledger-update | manual

Failure Rule:
- Missing → hard fail before deploy

---

### EXECUTION_PLANE

Allowed:
- paper | live

Rules:
- Phase 1.7 / Phase 2: paper only

Failure Rule:
- Missing → hard fail before deploy

---

### EXCHANGE_PROVIDER

Allowed:
- binance

Failure Rule:
- Missing → hard fail before deploy

---

### SAFETY_MODE

Allowed:
- normal | halt | flatten

Failure Rule:
- Missing → hard fail before deploy

---

### LOG_LEVEL

Allowed:
- debug | info | warn | error

Failure Rule:
- Missing → hard fail before deploy

---

### ENABLE_AUDIT_LOGGING

Allowed:
- true | false

Rules:
- prod: MUST be true

Failure Rule:
- Missing → hard fail before deploy

## Secret Handling Rules

- Secrets are defined only in GitHub Environments
- Secrets MUST NOT be committed
- Secrets MUST NOT be logged
- Secrets MUST NOT be defaulted
- Secrets MUST be injected only at deploy time

If any required secret is missing:
- The workflow MUST fail immediately
- No deploy attempt is allowed

---

## Workflow Interaction Rules

The deploy workflow:

- Reads secrets from the selected GitHub Environment
- Reads variables from the selected GitHub Environment
- Fails fast if any required secret is missing
- Passes secrets only to the Deploy Agent and runtime container
- Never stores secrets in artifacts or logs

The workflow MUST NOT:
- Infer secret values
- Substitute missing secrets
- Continue on secret-related errors

---

## Operator Model

Operator:
- Exactly one human operator exists (you)

Rules:
- All deployments are manual
- All deployments are deliberate
- All environment changes are reviewed

There is no automated promotion from dev to prod.

---

## Non-Goals (Phase 1.7)

This document does NOT define:
- Secret rotation
- Multiple operators
- Approval gates
- Audit logs of secret changes
- Runtime secret refresh

These are explicitly deferred.

---

## Closing Rule

Any change to:
- environments
- secret names
- secret semantics
- failure behavior

requires:
- updating this document
- explicit review
- agreement before implementation

Secrets and environments MUST remain boring, explicit, and auditable.