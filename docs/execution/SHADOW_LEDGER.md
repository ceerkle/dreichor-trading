# Shadow Ledger Specification (v1-final)

## Purpose
This document defines the **Shadow Ledger**.

The Shadow Ledger is a deterministic, derived state that reflects
**what has happened**, not what was intended or decided.

It is the sole source of truth for positions resulting from execution.

---

## Core Principle

> The Shadow Ledger derives state exclusively from **ExecutionOutcomes**.

It does not reason about intent, strategy, lifecycle, pricing, or budgets.

---

## Inputs (v1)

The Shadow Ledger consumes **only** the following inputs:

- `ExecutionOutcome`
- `ExecutionPlane`

No other inputs are permitted.

OrderIntent is **not** an input.

---

## Deterministic Derivation Rule

The Shadow Ledger is updated by applying ExecutionOutcomes sequentially.

```ts
nextState = applyExecutionOutcome(previousState, executionOutcome)
```

Rules:
- Order of outcomes is significant
- Identical ordered sequences produce identical states
- No randomness
- No wall-clock time

This forms a pure reducer.

---

## Shadow Ledger State (v1)

```ts
ShadowLedgerState {
  plane: ExecutionPlane
  positions: Record<MarketId, Position>
}
```

### Position (v1)

```ts
Position {
  marketId: MarketId
  quantity: DecimalString
  isOpen: boolean
  lastExecutionId: ExecutionId
}
```

Notes:
- Quantity is opaque (no pricing semantics)
- Only one position per market in v1
- No partial aggregation logic beyond open/close

---

## Execution Outcome Handling (v1)

### FILLED BUY
- Create or open a position for the market
- Set quantity = filledQuantity
- Set isOpen = true

### FILLED SELL
- Close the position for the market
- Set quantity = "0"
- Set isOpen = false

### FAILED
- No state change

### PARTIALLY_FILLED
- Not used in v1
- MUST NOT change state

---

## Deviation Classes (v1)

Deviation classes are finite and named.

```ts
DeviationClass =
  | "NONE"
  | "EXECUTION_FAILED"
```

Mapping:
- FILLED → "NONE"
- FAILED → "EXECUTION_FAILED"

No other deviations are recognized in v1.

---

## Plane Separation Rule

Paper and Live ledgers MUST be strictly separated.

Rules:
- Each ExecutionPlane has its own ShadowLedgerState
- ExecutionOutcomes from one plane MUST NEVER affect the other
- Implementations SHOULD use separate state objects or reducers per plane

---

## Replay Guarantees

- Replaying the same ordered ExecutionOutcomes yields the same ShadowLedgerState
- Shadow Ledger state is serializable and replayable

---

## Non-Goals (v1)

The Shadow Ledger does not:
- calculate PnL
- apply fees
- reason about balances
- enforce budgets
- mutate lifecycle or strategy state
- trigger execution

---

## Error Handling

Invalid ExecutionOutcomes MAY throw structural errors.

Domain-level failures are represented via DeviationClass and state behavior.

---

## Closing Rule

Any extension to Shadow Ledger semantics requires:
- update to this document
- version increment
- review before implementation

No silent behavior is permitted.
