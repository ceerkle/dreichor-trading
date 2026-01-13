# Decision Memory Specification

## Purpose
This document defines how the system records, aggregates, and applies
**Decision Memory**.

Decision Memory exists to calibrate behavior over time
without modifying strategy logic.

---

## Core Principle

> The system remembers decisions,
> not rules.

Decision Memory influences *how cautious or decisive*
the system behaves, never *what it decides*.

---

## Scope

Decision Memory applies to:
- strategy instances
- decision classes
- contextual patterns

It does not apply to:
- individual trades
- raw price movements
- parameter values

---

## Memory Units

The smallest unit of memory is a **Decision Memory Entry**.

Each entry aggregates:
- Decision Class
- Context summary (attention state, stability, confidence)
- Observed Outcome categories
- Occurrence count

No raw timelines are stored.

---

## Aggregation Rules

Memory entries are:
- aggregated over time windows
- merged by Decision Class and context similarity
- bounded in size

Aggregation must:
- smooth out noise
- ignore isolated events
- preserve long-term tendencies

---

## Outcome Categories

Outcomes are classified into qualitative categories, such as:

- Confirmed
- Premature
- Unnecessary
- Risky but Justified
- Inconclusive

Outcome categories are finite and named.

---

## Influence Boundaries

Decision Memory may influence:
- required stability before acting
- hesitation thresholds for rotation
- confidence modulation

Decision Memory must never influence:
- strategy rules
- market interpretation logic
- parameter pool definitions
- safety behavior

---

## Temporal Behavior

Decision Memory effects:
- apply gradually
- decay slowly over time
- never change abruptly

No single outcome may dominate memory.

---

## Isolation

Decision Memory is:
- isolated per strategy instance
- not shared globally by default

Explicit sharing requires documentation.

---

## Auditability

For any decision, the system must be able to explain:

- which memory entries were consulted
- how they influenced behavior
- why they did not block or force action

---

## Non-Goals

Decision Memory does not:
- optimize performance
- predict outcomes
- replace user judgment
- self-modify strategies

---

## Closing Rule

Any new memory influence or category requires
explicit documentation here before use.

No implicit learning is allowed.
