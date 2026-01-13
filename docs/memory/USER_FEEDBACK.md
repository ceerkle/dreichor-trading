# User Feedback Model

## Purpose
This document defines how **user feedback** is captured and applied
to Decision Memory without introducing bias, control coupling,
or hidden optimization.

User feedback calibrates behavior.
It does not direct decisions.

---

## Core Principle

> The user provides judgment,
> not commands.

Feedback informs the system about perceived decision quality,
not desired future actions.

---

## Scope

User feedback applies to:
- decision classes
- aggregated behavior patterns

User feedback does not apply to:
- individual trades
- specific markets
- parameter values
- execution outcomes

---

## Feedback Timing

Feedback is:
- retrospective
- delayed
- optional

Immediate feedback at decision time is not allowed,
to avoid emotional bias.

---

## Feedback Types

Feedback is expressed using a finite set of qualitative categories:

- Would Allow Again
- Too Nervous
- Too Hesitant
- Risky but Acceptable
- Unnecessary
- Inconclusive

Feedback categories are descriptive, not prescriptive.

---

## Feedback Granularity

Feedback may be applied to:
- a single decision class
- a time-bounded set of decisions
- a recurring behavioral pattern

Feedback is never applied to:
- a single execution detail
- raw market movement

---

## Aggregation Rules

User feedback:
- is aggregated over time
- is smoothed to avoid spikes
- never overrides decision memory alone

Conflicting feedback neutralizes influence.

---

## Influence Boundaries

User feedback may influence:
- confidence modulation
- hesitation thresholds
- stability requirements

User feedback must never:
- force or block a specific decision
- modify strategy logic
- alter safety behavior
- change parameter pools

---

## Abuse Prevention

The system must:
- ignore extreme outliers
- detect contradictory patterns
- require repeated feedback before influence

Feedback is advisory, not authoritative.

---

## Auditability

For any behavioral change influenced by feedback,
the system must be able to explain:

- which feedback categories were considered
- how they were aggregated
- why they influenced behavior

---

## Non-Goals

User feedback does not:
- train a model
- optimize performance
- predict markets
- replace governance

---

## Closing Rule

Any new feedback category or effect requires
explicit documentation here before use.

No implicit feedback handling is allowed.
