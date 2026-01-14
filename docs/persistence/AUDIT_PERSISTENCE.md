# Audit & Persistence Specification (v1-final)

## Purpose
This document defines the **audit and persistence contracts** of the system.

It specifies **what must be recorded** to allow deterministic reconstruction,
debugging, and responsibility tracing.

It does **not** define storage technology, IO, or runtime behavior.

---

## Core Principles

- Audit is append-only
- Events are the source of truth
- Snapshots are derived, non-authoritative optimizations
- All types are closed, versioned, and explicit

---

## Common Fields (v1)

All audit records share the following fields:

```ts
AuditBase {
  id: UUID
  type: string
  version: 1
  logicalTime: LogicalTime
  createdAtLogical: LogicalTime
}
```

Notes:
- `createdAtLogical` equals `logicalTime` in v1
- Wall-clock timestamps are forbidden

---

## Material Events (v1)

### AuditEvent (closed union)

```ts
AuditEvent =
  | DecisionEvaluatedEvent
  | OrderIntentCreatedEvent
  | OrderIntentSkippedEvent
  | SafetyEvaluatedEvent
  | ExecutionAttemptedEvent
  | ExecutionOutcomeRecordedEvent
  | LedgerUpdatedEvent
  | UserFeedbackRecordedEvent
```

---

### Event Definitions

#### DecisionEvaluatedEvent

```ts
DecisionEvaluatedEvent extends AuditBase {
  type: "DECISION_EVALUATED"
  strategyInstanceId: UUID
  decisionClass: DecisionClass
}
```

#### OrderIntentCreatedEvent

```ts
OrderIntentCreatedEvent extends AuditBase {
  type: "ORDER_INTENT_CREATED"
  orderIntentId: UUID
  side: "BUY" | "SELL"
  marketId: MarketId
}
```

#### OrderIntentSkippedEvent

```ts
OrderIntentSkippedEvent extends AuditBase {
  type: "ORDER_INTENT_SKIPPED"
  reason: ReasonCode
}
```

#### SafetyEvaluatedEvent

```ts
SafetyEvaluatedEvent extends AuditBase {
  type: "SAFETY_EVALUATED"
  decisionId: UUID
  result: SafetyEvaluationResult
}
```

#### ExecutionAttemptedEvent

```ts
ExecutionAttemptedEvent extends AuditBase {
  type: "EXECUTION_ATTEMPTED"
  decisionId: UUID
  executionId: UUID
  plane: ExecutionPlane
}
```

#### ExecutionOutcomeRecordedEvent

```ts
ExecutionOutcomeRecordedEvent extends AuditBase {
  type: "EXECUTION_OUTCOME_RECORDED"
  decisionId: UUID
  executionId: UUID
  status: ExecutionStatus
}
```

#### LedgerUpdatedEvent

```ts
LedgerUpdatedEvent extends AuditBase {
  type: "LEDGER_UPDATED"
  plane: ExecutionPlane
  marketId: MarketId
}
```

#### UserFeedbackRecordedEvent

```ts
UserFeedbackRecordedEvent extends AuditBase {
  type: "USER_FEEDBACK_RECORDED"
  feedbackId: UUID
  category: UserFeedbackCategory
  target: UserFeedbackTarget
}
```

---

## Snapshots (v1)

### AuditSnapshot (closed union)

```ts
AuditSnapshot =
  | ShadowLedgerSnapshot
```

---

### ShadowLedgerSnapshot

```ts
ShadowLedgerSnapshot {
  snapshotId: UUID
  type: "SHADOW_LEDGER_SNAPSHOT"
  version: 1
  logicalTime: LogicalTime
  plane: ExecutionPlane
  positions: Record<MarketId, Position>
}
```

---

## Referential Rules

- IDs must reference previously recorded events or domain entities
- Snapshots must be derivable from prior events
- No snapshot may introduce new facts

---

## Non-Goals (v1)

This layer does not:
- persist budgets
- record market data ticks
- store derived metrics
- implement retention or compaction

---

## Closing Rule

Any new audit event or snapshot type requires:
- explicit addition to this document
- version increment
- review before implementation

All audit-relevant user feedback MUST be represented as an AuditEvent and MUST conform to AuditBase.

All execution- and safety-related audit events MUST reference the originating decisionId.
This reference MUST be explicit.
No reverse lookup or inference is permitted.

No implicit persistence is allowed.
