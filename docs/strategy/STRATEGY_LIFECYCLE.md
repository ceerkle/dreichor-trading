# Strategy Lifecycle Specification

## Purpose
This document defines the **complete lifecycle** of a strategy instance.

It specifies:
- when decisions are evaluated
- how positions are entered and exited
- how hold time and cooldown are enforced
- how safety overrides normal behavior

This document is **authoritative**.
Implementation must follow it exactly.

---

## Lifecycle Overview

A strategy instance progresses through the following high-level phases:

1. Initialization
2. Idle (No Position)
3. Evaluation
4. Entry (Buy)
5. Holding
6. Exit (Sell)
7. Cooldown
8. Re-entry Eligibility

At any time, a **Safety Exit** may interrupt the normal flow.

---

## 1. Initialization

Upon creation, a strategy instance:

- is assigned its configuration
- has no active position
- has no cooldown
- has an empty decision memory reference

After initialization, the instance enters **Idle**.

---

## 2. Idle (No Position)

In Idle state:

- the strategy instance holds no position
- it may evaluate markets
- it may decide to take no action

Transition conditions:
- → Evaluation when triggered by the Meta Layer

---

## 3. Evaluation

During Evaluation:

- the strategy instance receives:
  - current strategy state
  - market snapshots
  - logical time context
- RAGE decision logic is executed

Possible outcomes:
- No Action
- Create Buy OrderIntent

Rules:
- Evaluation is deterministic
- No execution occurs here

Transitions:
- → Entry if Buy OrderIntent is created
- → Idle if No Action

---

## 4. Entry (Buy)

When a Buy OrderIntent exists:

- execution is attempted in the selected execution plane
- execution outcome is observed

Possible outcomes:
- Execution success → Position created
- Execution failure → return to Idle

Rules:
- Only one Buy may be active at a time
- Buy must complete before any further evaluation

Transitions:
- → Holding on success
- → Idle on failure

---

## 5. Holding

While Holding:

- the strategy instance has exactly one open position
- a minimum Hold Time applies
- markets continue to be evaluated

During Holding, the strategy may decide:
- to continue holding
- to rotate to another market
- to exit for safety reasons

Rules:
- Rotation is not allowed before Hold Time expires
- Safety exits ignore Hold Time

Transitions:
- → Exit (Rotation Sell)
- → Exit (Safety Sell)
- → Holding (no change)

---

## 6. Exit (Sell)

When exiting a position:

- a Sell OrderIntent is created
- execution is attempted

Exit reasons:
- Rotation Sell (attention-based)
- Safety Sell (risk-based)

Rules:
- Sell execution is mandatory once initiated
- No new Buy may occur until Sell completes

Transitions:
- → Cooldown on successful exit
- → Holding if Sell fails and position remains

---

## 7. Cooldown

After a successful exit:

- the strategy instance enters Cooldown
- no Buy evaluations are allowed

Rules:
- Cooldown duration is fixed per instance
- Safety monitoring continues

Transitions:
- → Re-entry Eligibility when Cooldown expires

---

## 8. Re-entry Eligibility

After Cooldown:

- the strategy instance may evaluate markets again
- normal Evaluation rules apply

Transitions:
- → Evaluation
- → Idle

---

## Safety Exit (Interrupt)

At any lifecycle stage, a Safety Condition may trigger.

### Applicability
- A Safety Exit results in a Safety Sell **only if an open position exists**.
- If no position exists, the Safety Condition is recorded, but no lifecycle
  transition occurs.

### Safety Exit Rules
- Overrides all other decisions
- Ignores Hold Time and Cooldown
- Must be evaluated as soon as possible

### Execution Outcome
- On successful Safety Sell → Cooldown
- On Safety Sell failure (position remains open) → Holding

Safety execution failures are considered critical incidents and are escalated,
but lifecycle state transitions remain deterministic.

---

## Invariants

- At most one open position per strategy instance
- Buy and Sell are never concurrent
- Execution never occurs without an OrderIntent
- Strategy logic never executes during execution

---

## Closing Rule

Any change to this lifecycle:
- requires an explicit ADR
- invalidates existing implementations until updated

No implicit lifecycle changes are allowed.