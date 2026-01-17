# Runtime Startup Sequence (Phase 1.5)

## Purpose

This document defines the **exact startup sequence** of the runtime
in Phase 1.5.

Its goal is to ensure that:
- startup behavior is deterministic
- all prerequisites are validated explicitly
- failures occur early, clearly, and safely
- no implicit initialization takes place

Startup is a **gate**, not a convenience.

---

## Core Principle

> The runtime MUST either start in a fully valid state  
> or fail immediately with a clear error.

Partial startup is forbidden.

---

## Startup Preconditions

Before startup is attempted, the following MUST be true:

- the container image is built successfully
- required environment variables are present
- database migrations have already been applied
- the execution plane is configured explicitly

If any precondition is not met, startup MUST NOT begin.

---

## Strict Startup Sequence

The runtime MUST execute the following steps in order.
No step may be skipped or reordered.

---

### 1. Environment Validation

The runtime validates all environment variables against:

`docs/infra/ENV_SCHEMA.md`

Rules:
- every required variable MUST be present
- no implicit defaults are allowed
- invalid values MUST cause failure

If validation fails:
- startup aborts immediately
- a clear error is logged
- the process exits with non-zero code

---

### 2. Configuration Freeze

After validation:
- configuration is frozen in memory
- configuration MUST NOT change at runtime
- dynamic reloads are forbidden in Phase 1.5

This ensures deterministic behavior.

---

### 3. Database Connectivity Check

The runtime:
- establishes a database connection
- verifies basic connectivity
- optionally verifies schema compatibility

Rules:
- no schema changes are allowed
- connection failure aborts startup
- retries are NOT allowed

---

### 4. Persistence Adapter Initialization

The runtime initializes persistence adapters:
- audit event store
- snapshot store

Rules:
- adapters MUST be available before proceeding
- failures MUST abort startup
- degraded modes are NOT allowed

Persistence is a hard dependency.

---

### 5. Initial State Reconstruction (Replay)

The runtime reconstructs initial state by replay:

- read all persisted audit events (ordered)
- apply reducers deterministically
- restore:
  - Shadow Ledger state
  - Decision Memory state (if required)

Rules:
- replay MUST be deterministic
- replay failures abort startup
- no mutation outside reducers is allowed

A successful replay defines the initial runtime state.

---

### 6. Execution Plane Initialization

The runtime:
- initializes the configured execution plane
- verifies plane-specific invariants
- binds executors (paper or stubbed live)

Rules:
- plane MUST match persisted state
- mismatches abort startup
- no automatic fallback is allowed

---

### 7. Meta Orchestrator Initialization

The runtime initializes:
- Meta Orchestrator v1
- all required ports and adapters

Rules:
- orchestrator wiring MUST be explicit
- missing dependencies abort startup
- no background execution starts yet

---

### 8. Safety Gate Initialization

The runtime initializes safety controls:
- kill switch state
- safety gate configuration

Rules:
- default safety state MUST be explicit
- implicit “safe defaults” are forbidden
- safety must be observable

---

### 9. Runtime Ready Signal

Only after all previous steps succeed:

- runtime logs “READY”
- runtime begins processing inputs (ticks, triggers)

No side effects are allowed before this point.

---

## Failure Handling

If startup fails at any step:
- the runtime MUST NOT process inputs
- no partial state may persist
- the process MUST exit

Failures are:
- explicit
- blocking
- operator-visible

---

## Observability Requirements

Startup MUST emit:
- step-by-step logs
- clear failure reasons
- final READY signal

Logs are the primary observability mechanism in Phase 1.5.

---

## Non-Goals (Phase 1.5)

This startup model does NOT include:
- hot reload
- rolling restarts
- health probes
- supervisor integration
- automatic recovery

---

## Review & Change Policy

Any change to:
- startup order
- validation rules
- failure semantics

requires:
- update to this document
- explicit review
- operator agreement

---

## Closing Rule

Startup defines system trust.

It MUST remain:
- strict
- boring
- deterministic
- reviewable

No implicit behavior is allowed.