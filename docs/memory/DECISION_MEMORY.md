# Decision Memory Specification (v1-final)

## Purpose

Decision Memory is a **read-only, deterministic memory layer**
that aggregates *what happened* to past decisions.

It does **not**:
- influence decisions
- optimize parameters
- enforce policies
- perform scoring or learning

Decision Memory exists to make **decision quality observable over time**
and to serve as an input for **external governance frameworks** (e.g. dreichor).

---

## Core Principles

- Deterministic
- Append-only (via reduction)
- Replayable
- Observational only
- No wall-clock time
- No IO / persistence logic

Decision Memory MUST NOT affect runtime behavior.

---

## Inputs (v1)

Decision Memory is derived **exclusively** from:

- `AuditEvent` (as defined in `AUDIT_PERSISTENCE.md`)
- `UserFeedbackRecord` (as defined in `USER_FEEDBACK.md`)

No other inputs are allowed.

---

## Decision Memory Entry (v1)

A `DecisionMemoryEntry` represents the accumulated observations
for exactly one decision.

```ts
DecisionMemoryEntry {
  decisionId: UUID
  decisionClass: DecisionClass
  firstSeenLogicalTime: LogicalTime

  execution: DecisionExecutionSummary
  safety: DecisionSafetySummary
  feedback: DecisionFeedbackSummary
}
```

## Execution Summary (v1)

```ts
DecisionExecutionSummary {
  executionsObserved: number
  filledCount: number
  failedCount: number
  lastExecutionStatus?: ExecutionStatus
}
```

Rules:
- Increment executionsObserved on every ExecutionOutcomeRecordedEvent
- Increment filledCount if status === “FILLED”
- Increment failedCount if status === “FAILED”
- Update lastExecutionStatus deterministically

---

## Safety Summary (v1)

```ts
DecisionSafetySummary {
  evaluationsObserved: number
  blockedCount: number
  forcedSellCount: number
  lastSafetyResult?: SafetyEvaluationResult
}
```

---

## Feedback Summary (v1)

```ts
DecisionFeedbackSummary {
  feedbackCount: number
  categories: Record<UserFeedbackCategory, number>
}
```

Rules:
- Increment feedbackCount on every UserFeedbackRecordedEvent
- Increment the corresponding category counter
- No weighting, scoring, or interpretation

---

## Decision Memory State (v1)

```ts
DecisionMemoryState {
  version: 1
  entries: Record<UUID, DecisionMemoryEntry>
}
```

---

## Reducer (v1)

Decision Memory MUST be built via a deterministic reducer:

```ts
reduceDecisionMemoryV1(
  prev: DecisionMemoryState,
  input: AuditEvent | UserFeedbackRecord
): DecisionMemoryState
```

Reduction Rules
- If the referenced decisionId does not exist:
    - create a new DecisionMemoryEntry
- Updates MUST be:
    - deterministic
    - idempotent
    - order-dependent only on logicalTime

No sorting, batching, or heuristics are allowed.

---

Referential Rules
- All inputs MUST reference an existing decisionId
- Invalid references MUST throw (structural error)
- No silent drops

---

Non-Goals

Decision Memory does NOT:
- compute success rates
- rank decisions
- block actions
- recommend changes
- alter parameters
- infer confidence

All interpretation is delegated to external systems.

---

## Relationship to Governance (e.g. dreichor)

Decision Memory is a passive observation layer.

Governance frameworks MAY:
- read Decision Memory
- analyze patterns
- propose actions

They MUST NOT:
- mutate Decision Memory
- bypass the audit trail

---

## Closing Rule

Any change to Decision Memory requires:
- explicit update to this document
- version increment
- full replay validation

Decision Memory MUST remain explainable, bounded, and boring.