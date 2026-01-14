# User Feedback Specification (v1-final)

## Purpose
This document defines how **user feedback is recorded and audited**.

User feedback is observational input. It does **not** directly influence
decisions, safety, execution, or parameters.

---

## Core Principles

- Feedback is explicit and structured
- Feedback is never interpreted automatically
- Feedback is append-only and audit-recorded
- Feedback must reference an existing system artifact

---

## UserFeedbackCategory (v1, closed set)

```ts
UserFeedbackCategory =
  | "DECISION_QUALITY"
  | "RISK_COMFORT"
  | "SYSTEM_BEHAVIOR"
```

---

## UserFeedbackTarget (v1)

Feedback must target exactly one of the following:

```ts
UserFeedbackTarget =
  | { type: "DECISION"; decisionId: UUID }
  | { type: "EXECUTION"; executionId: UUID }
  | { type: "TIME_WINDOW"; from: LogicalTime; to: LogicalTime }
```

---

## UserFeedbackRecord (v1)

```ts
UserFeedbackRecord {
  id: UUID
  version: 1
  category: UserFeedbackCategory
  target: UserFeedbackTarget
  comment?: string
  logicalTime: LogicalTime
}
```

---

## Deterministic ID Rule

`id` MUST be deterministically derived from:
- category
- target
- logicalTime

No randomness or wall-clock time is permitted.

---

## Audit Event (v1)

User feedback MUST emit an audit event:

User feedback recording emits a `UserFeedbackRecordedEvent`
as defined in `docs/persistence/AUDIT_PERSISTENCE.md`.

This document defines the semantic content of feedback,
not the audit envelope.

---

## Validation Rules (v1)

Feedback MUST be rejected if:
- target reference does not exist syntactically
- logicalTime is missing
- category is not in the closed set

Feedback MUST NOT:
- modify state
- trigger actions
- affect safety or execution

---

## Non-Goals

This layer does not:
- score feedback
- aggregate feedback
- infer confidence or trust
- modify strategies or parameters

---

## Closing Rule

Any extension requires:
- update to this document
- version increment
- review before implementation
