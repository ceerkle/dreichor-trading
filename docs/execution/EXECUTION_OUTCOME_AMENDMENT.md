# Execution Planes Specification (v1-final amendment)

## Amendment: ExecutionOutcome Context Completeness (v1)

To enable deterministic Shadow Ledger derivation without implicit lookups,
the ExecutionOutcome type is extended with explicit market and side context.

This amendment is normative for all v1 implementations.

---

## Updated ExecutionOutcome (v1)

```ts
ExecutionOutcome {
  executionId: UUID
  orderIntentId: UUID
  plane: ExecutionPlane
  status: ExecutionStatus
  side: "BUY" | "SELL"
  marketId: MarketId
  filledQuantity: DecimalString
  logicalTime: LogicalTime
  reason?: ExecutionReasonCode
}
```

---

## Rationale

Shadow Ledger derivation MUST:
- depend exclusively on ExecutionOutcome
- avoid implicit lookups or hidden joins
- remain replayable and self-contained

Without `marketId` and `side`, a FILLED outcome cannot be deterministically
interpreted as opening or closing a position.

Therefore:
- ExecutionOutcome is the full semantic boundary between execution and state.
- Shadow Ledger reducers MUST NOT depend on OrderIntent.

---

## Compatibility Note

This change:
- does not alter execution behavior
- does not introduce IO or nondeterminism
- only enriches the observable execution record

Existing v1 execution implementations MUST populate these fields.

---

## Closing Rule

Any future ExecutionOutcome field additions require:
- explicit documentation
- version increment
- review prior to implementation
