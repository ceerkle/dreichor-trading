# Meta Orchestration Specification (v1)

## Purpose

This document defines the **Meta Layer Orchestration**.

The Meta Layer is responsible for **sequencing and wiring**
already-defined deterministic components into a single,
auditable system tick.

It does **not**:
- introduce new decision logic
- interpret results
- retry or optimize execution
- perform IO beyond invoking existing runtime ports

---

## Core Principle

> The Meta Layer is glue, not intelligence.

All intelligence lives in Core modules.
All side effects live in Runtime adapters.
The Meta Layer only **orders and validates**.

---

## Meta Tick (v1)

The Meta Layer operates in discrete, deterministic ticks.

```ts
MetaTickInput {
  logicalTime: LogicalTime
  strategyInstanceId: UUID
  executionPlane: ExecutionPlane
  safetyGates: SafetyGates
}
```

```ts
MetaTickResult {
  decision?: Decision
  orderIntent?: OrderIntent | NoIntent
  safetyResult?: SafetyEvaluationResult
  executionOutcome?: ExecutionOutcome
  ledgerState?: ShadowLedgerState
  decisionMemory?: DecisionMemoryState
  auditEvents: AuditEvent[]
}
```

No field may be populated implicitly.

---

## Execution Order (Strict)

The Meta Layer MUST execute the following steps **in order**.  
No step may be skipped or reordered.

1. **Decision Evaluation**
   - Input: Strategy + Domain State
   - Output: Decision
   - Emit: DecisionEvaluatedEvent

2. **Order Intent Creation**
   - Input: Decision + Parameter Pools
   - Output: OrderIntent | NoIntent
   - Emit: OrderIntentCreatedEvent or OrderIntentSkippedEvent

3. **Safety Evaluation**
   - Input: OrderIntent | NoIntent + ShadowLedgerState + SafetyGates
   - Output: SafetyEvaluationResult
   - Emit: SafetyEvaluatedEvent

4. **Execution**
   - Input: Allowed OrderIntent
   - Output: ExecutionOutcome
   - Emit: ExecutionAttemptedEvent + ExecutionOutcomeRecordedEvent

5. **Shadow Ledger Update**
   - Input: ExecutionOutcome
   - Output: ShadowLedgerState
   - Emit: LedgerUpdatedEvent

6. **Decision Memory Update**
   - Input: AuditEvents
   - Output: DecisionMemoryState

7. **User Feedback Recording**
   - Optional
   - Emits: UserFeedbackRecordedEvent

8. **Persistence**
   - Append all AuditEvents
   - Persist Snapshots if configured

---

## Determinism Rules

- LogicalTime is the only notion of time
- No randomness
- No retries
- No implicit defaults
- Same inputs MUST yield same outputs

---

## Error Handling

Structural violations MUST throw immediately:
- missing required inputs
- invalid references
- plane mismatches
- illegal state transitions

Domain-level failures MUST be represented explicitly  
via existing result types.

---

## Non-Goals (v1)

The Meta Layer does not:
- optimize execution
- debounce ticks
- manage concurrency
- apply backpressure
- infer intent

---

## Closing Rule

Any change to orchestration order or semantics requires:
- update to this document
- version increment
- full replay validation

The Meta Layer MUST remain boring, explicit, and reviewable.