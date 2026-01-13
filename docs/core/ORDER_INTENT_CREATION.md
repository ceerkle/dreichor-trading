# Order Intent Creation (v1)

## Purpose
This document defines how **OrderIntents** are created.

OrderIntent creation is the step where prior, already-made decisions
are **materialized** into an explicit intent to act — or an explicit decision
to not act.

This step does **not** execute orders and does **not** modify system state.

---

## Core Principle

> OrderIntent Creation does not decide *what is good*.
> It only decides *whether an action is permitted and materialized*.

All intelligence lives upstream.
Execution lives downstream.

---

## Scope of Step 5

OrderIntent Creation:
- combines existing outputs
- creates at most **one** OrderIntent per cycle
- or returns an explicit **NoIntent**

OrderIntent Creation does **not**:
- execute orders
- check balances or budgets
- compute prices or quantities
- mutate lifecycle state
- persist data

---

## Inputs (Read-Only)

OrderIntent Creation consumes the following inputs:

- **Strategy Lifecycle State**
- **Attention / Worthiness Decision**
- **Selected Parameter Pool**
- **Safety / Meta Gating Flags**
- **LogicalTime**

All inputs are treated as immutable facts.

---

## Possible Outputs

Exactly one of the following MUST be returned:

### BUY OrderIntent
Creates an intent to enter a position.

### SELL OrderIntent
Creates an intent to exit a position.

### NoIntent
An explicit decision to take no action in this cycle.

Returning `undefined` or `null` is forbidden.

---

## OrderIntent Structure (v1)

```ts
OrderIntent {
  id: OrderIntentId
  side: "BUY" | "SELL"
  marketId: MarketId
  intent: {
    type: "ALLOCATION"
    value: DecimalString
  }
}
```

Notes:
- `intent.value` is opaque at this stage.
- No unit or semantic interpretation occurs here.

---

## Intent ID Generation

OrderIntent IDs MUST be deterministic.

### Rule (v1)

```text
orderIntentId = hash(
  strategyInstanceId +
  marketId +
  side +
  logicalTime
)
```

Properties:
- deterministic
- replay-stable
- no randomness
- no wall-clock time

The exact hash/encoding mechanism is implementation-defined,
but MUST be deterministic.

---

## Allocation Value Rule (v1)

For v1, allocation values are derived as follows:

- BUY intents:
  - `intent.value` MUST come from the selected Parameter Pool
  - the value is treated as an opaque allocation amount

- SELL intents:
  - `intent.value` MUST equal the allocation value of the currently held position

No budget system is consulted in v1.

---

## Market Selection Rules

### BUY
- `marketId` MUST be the market selected by the Attention/Worthiness decision.

### SELL
- `marketId` MUST be the market of the currently held position.

Rotation is expressed as:
1. SELL current market
2. (later cycle) BUY new market

No combined BUY+SELL intents are allowed.

---

## Conditions for BUY Intent

A BUY intent MAY be created only if **all** are true:

- Lifecycle state allows entry (e.g. Idle or ReEntryEligible)
- Attention/Worthiness decision allows entry
- No open BUY is in progress
- Safety gating does not block entry

Otherwise, NoIntent MUST be returned.

---

## Conditions for SELL Intent

A SELL intent MAY be created only if **all** are true:

- A position exists
- Lifecycle state allows exit
- One of the following applies:
  - Attention/Worthiness recommends rotation
  - Safety Exit is active

Otherwise, NoIntent MUST be returned.

---

## NoIntent Rules

NoIntent MUST be returned if:

- Lifecycle blocks action
- Hold time has not elapsed
- Cooldown is active
- Attention/Worthiness is negative
- Safety explicitly blocks BUY
- Preconditions for BUY or SELL are not met

NoIntent is a valid, explicit outcome.

---

## Determinism Guarantees

- Identical inputs MUST produce identical outputs
- At most one OrderIntent per cycle
- No implicit fallback behavior
- No randomness

---

## Error Handling

OrderIntent Creation MUST NOT throw for domain conditions.

Invalid or blocked situations result in **NoIntent**, not errors.

Structural violations (e.g. missing required inputs) MAY throw.

---

## Auditability

Every OrderIntent or NoIntent decision MUST be auditable via:

- the resulting intent (or lack thereof)
- the inputs that led to it
- the deterministic ID

No hidden behavior is allowed.

---

## Non-Goals (v1)

OrderIntent Creation does not:
- optimize allocation sizes
- reason about profits or losses
- enforce budgets or balances
- execute orders
- persist decisions

---

## Closing Rule

Any change to OrderIntent semantics requires:
- an update to this document
- version increment
- review before implementation

No silent behavioral change is permitted.
