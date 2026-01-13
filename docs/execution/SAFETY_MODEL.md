# Safety & Risk Model

## Purpose
This document defines the **safety model** of the system.

Safety exists to prevent catastrophic loss and systemic failure.
It is explicitly **not** a trading strategy.

Safety rules override all other behavior.

---

## Core Principle

> When safety triggers, attention, worthiness, and strategy logic are irrelevant.

Safety decisions are about **risk containment**, not opportunity.

---

## Safety Conditions

A **Safety Condition** represents an unacceptable risk state.

Safety Conditions may include:
- severe adverse price movement
- market discontinuity
- loss of market integrity
- execution anomalies
- external system instability

Safety Conditions are detected outside strategy logic.

---

## Safety Trigger

When a Safety Condition is detected:

- a Safety Sell is immediately authorized
- all other lifecycle rules are bypassed

Safety Triggers:
- ignore Hold Time
- ignore Cooldown
- ignore Worthiness
- ignore Confidence

---

## Safety Sell

A Safety Sell is:

- an immediate exit intent
- mandatory once initiated
- executed in the active execution plane

A Safety Sell:
- is not reversible
- does not wait for better conditions
- does not attempt optimization

---

## Priority Rules

Safety has absolute priority over:

- strategy decisions
- execution timing preferences
- user-defined parameters

If safety and strategy conflict,
safety always wins.

---

## Failure Handling

If a Safety Sell execution fails:

- retries are allowed only if explicitly configured
- failures are escalated to Meta Layer
- the system must not resume normal trading

Failure to exit safely is a critical incident.

---

## Interaction with Lifecycle

Safety may interrupt the lifecycle at any stage:

- Idle
- Evaluation
- Entry
- Holding
- Cooldown

After a successful Safety Sell:
- the strategy enters Cooldown
- no immediate re-entry is allowed

---

## Auditability

Every Safety event must record:

- triggering condition
- triggering time
- execution outcome
- failure classification (if any)

Safety events are always persisted.

---

## Non-Goals

Safety does not:
- predict market behavior
- optimize exits
- adapt strategies
- generate signals

---

## Closing Rule

Any new Safety Condition or behavior requires:
- explicit documentation here
- review before activation

No implicit safety logic is permitted.
