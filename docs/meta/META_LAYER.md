# Meta Layer Specification

## Purpose
This document defines the **Meta Layer**, the orchestration and control layer
that operates **outside CHOR**.

The Meta Layer coordinates *when* things happen,
not *what* decisions are made.

---

## Core Principle

> The Meta Layer controls permission and sequencing,
> never intent.

It does not evaluate markets.
It does not modify strategy logic.

---

## Responsibilities

The Meta Layer is responsible for:

- strategy lifecycle orchestration
- evaluation scheduling
- execution plane selection
- execution gating
- preflight enforcement
- failure escalation
- governance integration (future)

---

## Strategy Scheduling

The Meta Layer determines:

- when a strategy instance may evaluate
- which inputs are provided
- how often evaluations occur

Scheduling:
- uses logical time
- is deterministic
- is independent of wall-clock time

---

## Evaluation Triggering

Before triggering evaluation, the Meta Layer ensures:

- strategy instance is in a valid lifecycle state
- no conflicting execution is in progress
- cooldown and hold time constraints are respected

If conditions are not met,
evaluation is skipped explicitly.

---

## Execution Gating

Before execution is allowed, the Meta Layer enforces:

- preflight checks (see PREFLIGHT.md)
- execution plane authorization
- safety override precedence

If gating fails:
- execution is blocked
- the decision is recorded as blocked
- no retries are attempted automatically

---

## Execution Plane Selection

The Meta Layer selects the active execution plane based on:

- configuration
- runtime mode
- governance constraints (future)

Strategies are unaware of the active plane.

---

## Failure Escalation

The Meta Layer handles:

- execution failures
- safety failures
- persistence failures

Failures are:
- classified
- recorded
- escalated explicitly

Silent recovery is forbidden.

---

## Governance Adapter (Stub)

The Meta Layer provides an integration point for governance frameworks.

Governance may:
- allow or block execution
- require additional confidence
- freeze strategy instances

Governance may not:
- alter decisions
- inject intent
- bypass safety

---

## Determinism

Meta Layer behavior must be:

- deterministic given identical inputs
- replayable
- explainable

Use of wall-clock time is forbidden
outside explicit scheduling boundaries.

---

## Non-Goals

The Meta Layer does not:
- optimize execution
- infer market conditions
- store business state
- override documented rules

---

## Closing Rule

Any new control or orchestration behavior
must be documented here before implementation.

No implicit Meta behavior is allowed.
