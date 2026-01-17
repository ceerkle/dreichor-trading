# Smoke Deploy Model — v1 (Phase 1.7)

## Purpose

This document defines the **first executable deployment validation**
for Phase 1.7.

The Smoke Deploy answers exactly one question:

> Can we deploy the runtime container to the server in a fully controlled,
> observable, and reversible way — without running the system?

This is a **non-functional deployment test**.
No trading logic runs.
No background execution starts.

---

## Definition of “Smoke Deploy”

A Smoke Deploy is a **deploy + verify + stop** cycle.

It validates:
- GitHub Actions → Deploy Agent connectivity
- Authentication via Cloudflare Access
- Container lifecycle correctness
- Environment injection
- Volume wiring
- Startup determinism

It does NOT validate:
- Strategy execution
- Persistence replay correctness
- Long-running behavior

---

## Preconditions (Hard)

All of the following MUST be true before running a Smoke Deploy:

- Phase 1.7 STEP 1–4 are completed
- `.github/workflows/deploy.yml` exists
- GitHub Environments `dev` and/or `prod` exist
- Required secrets are set in the target environment
- Database exists and is migrated
- Deploy Agent is reachable through Cloudflare Tunnel

If any precondition is unmet:
- The Smoke Deploy MUST NOT be executed

---

## Target Environment

Smoke Deploy MUST be executed in:

- Environment: dev
- Execution Plane: paper

Running a Smoke Deploy against prod is forbidden.

---

## Trigger Mechanism

Smoke Deploy is triggered manually via:

- GitHub Actions
- workflow_dispatch
- deploy.yml

Inputs:

- environment: dev
- image_tag: a known-good image tag
  (recommended: the commit SHA of the current branch)

No automatic triggers are allowed.

---

## Runtime Configuration (Smoke Mode)

The runtime MUST start with:

- EXECUTION_PLANE=paper
- No scheduler
- No background loops
- No live adapters
- No order execution

If the runtime starts any execution loop:
- The deploy is considered failed

---

## Expected Deploy Agent Flow

The Deploy Agent MUST perform exactly:

1. Pull the requested image
2. Stop existing container (if present)
3. Remove existing container (if present)
4. Start new container with:
   - server-owned container_name (Deploy Agent `CONTAINER_NAME`)
   - injected environment variables
   - volume mounts for audit-events and snapshots
5. Return success only if the container reaches “running” state

No retries.
No partial success.

---

## Verification Rules (CI Side)

After POST /v1/deploy returns success:

1. CI MUST call GET /v1/status
2. The response MUST satisfy:
   - running == true
   - container_name is present and matches the Deploy Agent-managed runtime container
   - image matches the requested image
   - started_at is present

If any check fails:
- The workflow MUST fail immediately

---

## Shutdown Rule (Smoke Only)

After successful verification:

- The runtime container MUST be stopped
- This can be done by:
  - a second deploy call with a known “stop-only” image, or
  - an explicit stop command, if supported by the Deploy Agent

If shutdown is not possible:
- The Smoke Deploy MUST be considered failed

No long-running container is allowed after Smoke Deploy.

---

## Observability Requirements

During Smoke Deploy, logs MUST show:

- Startup banner
- Environment validation success
- Persistence mount validation
- Replay phase start (even if empty)
- Meta Orchestrator initialization
- Idle state reached

Logs MUST NOT show:
- Order execution
- Strategy ticks
- External calls

---

## Failure Handling

Any failure during Smoke Deploy MUST:

- Fail the GitHub Action
- Leave the system in a stopped state
- Require manual inspection before retry

No automatic retries are allowed.

---

## Exit Criteria (STEP 5 Complete)

STEP 5 is complete when:

- A Smoke Deploy runs successfully in dev
- All checks pass
- The runtime container is stopped afterward
- No undocumented behavior is observed

Only after STEP 5 is complete may Phase 1.7 proceed.

---

## Closing Rule

The Smoke Deploy is a gate.

If it fails:
- Phase 1.7 MUST NOT proceed
- No shortcuts are allowed

Deployment validation MUST remain boring, explicit, and observable.