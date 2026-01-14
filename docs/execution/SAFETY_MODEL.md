# Safety Model Specification (v1-final)

## Purpose
This document defines the **Execution-side Safety Model**.

The Safety Model enforces hard safety constraints **between OrderIntent creation
and Execution**, without altering decision logic.

It is deterministic, replayable, and IO-free.

---

## Core Principle

> The Safety Model may block or force actions,
> but it never decides *what* to trade.

It only decides **whether** an action is allowed.

---

## Inputs (v1)

### SafetyEvaluationInput

```ts
SafetyEvaluationInput {
  proposed: OrderIntent | NoIntent
  ledger: ShadowLedgerState
  plane: ExecutionPlane
  gates: SafetyGates
  logicalTime: LogicalTime
}
```

No other inputs are permitted.

---

## SafetyGates (v1)

SafetyGates are explicit Meta-layer controls.

```ts
SafetyGates {
  haltAll: boolean
  blockBuy: boolean
  forceSell: boolean
}
```

Semantics:
- `haltAll`: immediately halts all BUY activity
- `blockBuy`: blocks BUY intents only
- `forceSell`: requires flattening of open positions

---

## Output (v1)

### SafetyEvaluationResult

```ts
SafetyEvaluationResult =
  | { type: "ALLOW" }
  | { type: "BLOCK_BUY"; reason: SafetyReason }
  | { type: "FORCE_SELL"; reason: SafetyReason }
  | { type: "HALT"; reason: SafetyReason }
```

### SafetyReason (closed set, v1)

```ts
SafetyReason =
  | "HALT_ALL_ACTIVE"
  | "BUY_BLOCKED"
  | "FORCE_SELL_ACTIVE"
  | "POSITION_ALREADY_OPEN"
```

---

## Deterministic Rules (v1)

Rules are evaluated in order.

### Rule 1 — Global Halt
If `gates.haltAll === true`:
- BUY → HALT
- SELL → ALLOW
- NoIntent → HALT

Reason: `HALT_ALL_ACTIVE`

---

### Rule 2 — Force Sell
If `gates.forceSell === true` AND ledger contains an open position:
- Output → FORCE_SELL

Reason: `FORCE_SELL_ACTIVE`

Notes:
- FORCE_SELL MAY generate a SELL intent downstream
- FORCE_SELL MUST NOT occur if no position is open

---

### Rule 3 — Block Buy
If `gates.blockBuy === true` AND proposed is BUY:
- Output → BLOCK_BUY

Reason: `BUY_BLOCKED`

---

### Rule 4 — Single Position Invariant
If proposed is BUY AND ledger already has an open position:
- Output → BLOCK_BUY

Reason: `POSITION_ALREADY_OPEN`

---

### Rule 5 — Default
If none of the above apply:
- Output → ALLOW

---

## Behavior Notes

- Safety never mutates ledger or lifecycle state
- Safety never executes orders
- Safety evaluation is pure and replayable
- SELL is always allowed unless halted globally

---

## Non-Goals (v1)

The Safety Model does not:
- compute risk metrics
- evaluate prices or volatility
- manage budgets or balances
- retry or schedule actions

---

## Closing Rule

Any extension to Safety Model behavior requires:
- update to this document
- version increment
- review prior to implementation

No implicit safety behavior is allowed.
