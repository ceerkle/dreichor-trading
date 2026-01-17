# Runtime Container Lifecycle & Restart Behavior (Phase 1.5)

## Purpose

This document explains the **currently observed and intentional** runtime container lifecycle
in **Phase 1.5**, including why the runtime container restarts repeatedly under Docker.

This is **documentation-only**. It does not change runtime, deploy, Docker, or CI behavior.

If any other infrastructure document contradicts this lifecycle description, **this document wins**
and the contradicting document MUST be corrected.

---

## Phase 1.5 Runtime Lifecycle (Observed / Intentional)

In Phase 1.5 the runtime process is a **bootstrap/replay-only** runtime.

The runtime container’s main process intentionally:

1. starts
2. validates environment variables strictly
3. connects to Postgres
4. initializes persistence adapters
5. replays persisted state deterministically
6. logs **READY**
7. exits **cleanly** with exit code **0**

This means **READY is a bootstrap completion signal**, not a guarantee of a long-lived service.

---

## Why the Container Restarts Repeatedly

The Deploy Agent starts the runtime container with the restart policy:

- `--restart unless-stopped`

Docker’s semantics are simple:

- if the container’s main process exits (even with exit code 0),
  Docker will restart it unless it has been explicitly stopped.

Therefore, in Phase 1.5:

- **clean exit (0)** + **restart policy (unless-stopped)** ⇒ **expected restart loop**

This loop is **not a bug** in Phase 1.5; it is a deliberate consequence of the current lifecycle.

---

## Why This Is Intentional in Phase 1.5

This setup is accepted and useful in the current phase because:

- **There is no long-lived event loop yet**
  - no market loop
  - no scheduler/tick processing
  - no durable “service mode” guarantee

- **Startup correctness is the primary objective**
  - strict env validation
  - database connectivity validation
  - deterministic replay validation

- **Restart loops expose regressions early**
  - repeated start/replay cycles make startup failures and drifts obvious in logs

- **The Deploy Agent lifecycle supports both present and future runtimes**
  - it can deploy ephemeral bootstrap runtimes today
  - it can deploy long-running runtimes later without changing the control-plane model

---

## Authority Split (Current / Enforced)

### GitHub / CI (Deployment Trigger Only)

GitHub Actions:

- MUST select target environment (`dev` or `prod`)
- MUST select runtime image reference/tag
- MUST authenticate via Cloudflare Access
- MUST trigger the Deploy Agent via its API
- MUST NOT inject runtime configuration
- MUST NOT validate runtime environment variables
- MUST NOT control container names or volume mappings

### Server / Deploy Agent (Runtime Authority)

The Deploy Agent:

- is the **only** component allowed to talk to Docker
- owns container name, volumes, and restart policy
- loads runtime configuration exclusively from server-side files:
  - dev: `/opt/dreichor/dev/runtime.env`
  - prod: `/opt/dreichor/prod/runtime.env`
- passes runtime configuration to Docker via `--env-file`

CI-provided runtime env fields are **forbidden** and MUST NOT influence runtime behavior.

---

## Database Model (Current)

- Postgres runs as a **host system service** (not containerized).
- Each environment has its own database and user.
- The runtime connects using `DATABASE_URL` from `runtime.env`, pointing to host Postgres.
- Database connectivity is part of runtime startup validation.

---

## What Will Change in Later Phases (Explicit Intent)

In later phases, the runtime is expected to become a **long-lived service**:

- a real event loop / scheduler will exist
- the runtime will remain “Up” under normal operation
- repeated restarts will indicate **real crashes**, not “expected completion”

At that point, the system will introduce (or re-evaluate) operational semantics such as:

- explicit health checks (readiness/liveness)
- runtime signal handling and controlled shutdown
- restart behavior and policies appropriate for a long-lived process

Until those phases exist, the Phase 1.5 restart loop MUST be treated as **expected and intentional**.

