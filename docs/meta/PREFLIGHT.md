# Preflight & Readiness Checks

## Purpose
This document defines **Preflight**, a mandatory readiness gate
that determines whether execution is allowed to proceed.

Preflight protects the system from acting
when prerequisites are not met.

---

## Core Principle

> If readiness cannot be proven,
> execution is forbidden.

Preflight is conservative by design.

---

## Scope

Preflight applies to:
- execution authorization
- execution plane readiness
- environment validation

Preflight does not apply to:
- decision evaluation
- market interpretation
- strategy logic

---

## Preflight Timing

Preflight is evaluated:

- before any Live execution
- before Safety execution in Live
- optionally before Paper execution (informational)

Preflight results are cached for a bounded period.

---

## Execution Plane Differences

### Paper Execution

Paper Preflight verifies:
- internal system consistency
- configuration completeness

Paper Preflight failure:
- does not block evaluation
- blocks execution

---

### Live Execution

Live Preflight verifies:

- exchange connectivity
- credential validity
- market availability
- symbol precision and minimums
- balance and reserve sufficiency
- execution permissions
- safety subsystem readiness

Any failure blocks execution.

---

## Preflight Checks

Each check produces:

- status (pass / fail)
- reason code
- human-readable explanation

Checks are finite and named.

---

## Failure Handling

If Preflight fails:

- execution is blocked
- the blocking reason is recorded
- no retries occur automatically

Resolution requires explicit change
(e.g. configuration update, recovery).

---

## Interaction with Meta Layer

The Meta Layer:
- triggers Preflight
- interprets results
- enforces blocking

Strategies are unaware of Preflight.

---

## Auditability

Every Preflight evaluation must record:

- execution plane
- evaluated checks
- results
- blocking reason (if any)

---

## Non-Goals

Preflight does not:
- attempt recovery
- degrade execution modes
- override safety
- modify strategy behavior

---

## Closing Rule

Any new readiness requirement
must be documented here before enforcement.

No implicit execution allowance is permitted.
