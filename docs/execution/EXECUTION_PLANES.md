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
- Execution produces exactly one ExecutionOutcome per intent
- Execution outcomes are observable and persisted
- Execution never retroactively changes decisions
- Logical time is provided externally and never advanced by execution

---

## Execution Outcome Model (v1)

Execution produces a single, explicit outcome object.

```ts
ExecutionOutcome {
  executionId: UUID
  orderIntentId: UUID
  plane: ExecutionPlane
  status: ExecutionStatus
  filledQuantity: DecimalString
  logicalTime: LogicalTime
  reason?: ExecutionReasonCode
}
```

### Execution Status (v1)

```ts
ExecutionStatus =
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "FAILED"
```

### Execution Reason Codes (v1)

```ts
ExecutionReasonCode =
  | "EXECUTION_NOT_AVAILABLE"
  | "EXECUTION_REJECTED"
```

This set is closed for v1.

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
- Uses logical time only
- No randomness, slippage, or pricing logic

### Deterministic Fill Rule (v1)

Paper execution ALWAYS results in a successful full fill.

Rules:
- status = FILLED
- filledQuantity = intent.requestedQuantity
- reason = undefined
- No partial fills
- No failures

### Guarantees
- Identical inputs produce identical outcomes
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

### Live Execution Stub (v1 Scope)

For Step 6, Live execution is implemented as a stub:
- No external I/O
- No exchange SDKs
- Deterministic success or deterministic failure is permitted
- Failures MUST include an ExecutionReasonCode

Live execution is the only plane where
real capital is at risk in production.

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
