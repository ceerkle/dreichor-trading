# Execution Planes Specification

## Purpose
This document defines how **OrderIntents** are executed
and how execution differs between environments.

Execution is strictly separated from decision-making.
This document specifies **what execution guarantees exist** and
**what they do not**.

---

## Execution Planes Overview

An **Execution Plane** is a controlled environment in which
OrderIntents are realized.

Defined planes:
- Paper Execution Plane
- Live Execution Plane

Execution planes:
- never alter decision logic
- never influence strategy evaluation
- only realize or fail intents

---

## Shared Execution Principles

All execution planes must adhere to the following:

- Execution always starts from an OrderIntent
- Execution outcomes are observable
- Execution may fail or partially succeed
- Execution never retroactively changes decisions

---

## Paper Execution Plane

### Purpose
The Paper plane exists to:
- validate system behavior
- observe decision quality
- test execution logic deterministically

### Characteristics
- Fully deterministic
- No external I/O
- Uses deterministic fill rules
- Uses logical time only

### Guarantees
- Identical inputs produce identical fills
- Replay produces identical results
- No hidden randomness

### Limitations
- No real liquidity
- No real latency
- No exchange-side failures

Paper execution is not a simulation of reality.
It is a deterministic realization of intent.

---

## Live Execution Plane

### Purpose
The Live plane exists to:
- interact with real markets
- place real orders
- observe real outcomes

### Characteristics
- Uses real exchange APIs
- Subject to latency and partial fills
- Subject to exchange errors and downtime

### Guarantees
- Order submission attempts are auditable
- Execution results are persisted
- Failures are explicit and classified

### Limitations
- Non-deterministic outcomes
- External dependencies
- Incomplete observability

Live execution is the only plane where
real capital is at risk.

---

## Plane Selection

Execution plane selection:
- occurs outside strategy logic
- is controlled by the Meta Layer
- is explicit and auditable

Strategies are unaware of the active execution plane.

---

## Failure Handling

Execution failures must:
- never trigger retries automatically
- never re-enter decision logic implicitly
- be surfaced as explicit outcomes

Recovery is a Meta-layer responsibility.

---

## Interaction with Safety

Safety mechanisms:
- may trigger forced execution (Safety Sell)
- bypass normal lifecycle checks
- are executed in the active plane

Safety does not change execution semantics.

---

## Non-Goals

Execution planes do not:
- optimize order placement
- adapt strategies
- hide failures
- infer intent

---

## Closing Rule

Any new execution environment requires:
- explicit definition as an execution plane
- documentation here
- approval before use

No implicit execution behavior is allowed.