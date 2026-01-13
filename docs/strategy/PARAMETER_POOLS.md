# Parameter Pools & Edgecase Selection

## Purpose
This document defines how strategies may use parameters
without allowing uncontrolled self-modification.

Parameters are **selected**, not learned or invented.

---

## Core Principle

> Strategies may adapt their behavior,
> but only within explicitly defined bounds.

Any parameter outside these bounds is invalid.

---

## Parameter Pools

A **Parameter Pool** is a predefined set of behavioral presets.

Pools are:
- finite
- named
- versioned
- human-readable

Pools represent *temperaments*, not optimizations.

---

## Example Pools (Conceptual)

The following examples illustrate intent.
Exact values are implementation-specific.

### Cautious
- High stability requirement
- High switching threshold
- Longer hold times
- Longer cooldowns

### Balanced
- Moderate stability requirement
- Clear but achievable switching threshold
- Standard hold times
- Standard cooldowns

### Assertive
- Lower stability requirement
- Higher sensitivity to attention shifts
- Shorter hold times
- Shorter cooldowns

---

## Pool Selection

Pool selection occurs during Evaluation.

Selection inputs may include:
- current attention state
- market volatility regime
- decision memory calibration

Rules:
- Only one pool may be active at a time
- Pool selection must be explicit
- Pool changes are part of the Decision output

---

## Edgecase Role

Edgecases may:
- recommend a pool
- recommend contextual modifiers within a pool

Edgecases may NOT:
- define new parameters
- exceed pool boundaries
- persist hidden state

Edgecases are advisory.

---

## Parameter Application

Selected parameters:
- apply only to the current decision context
- do not mutate global strategy configuration
- are immutable once selected

---

## Rejection Rules

A pool selection must be rejected if:
- it violates pool constraints
- confidence is insufficient
- decision memory enforces caution

Rejected selections result in:
- fallback to default pool
- or no action

---

## Auditability

Every decision must record:
- selected pool
- rejection (if any) and reason
- effective parameters used

No implicit parameter use is allowed.

---

## Non-Goals

This system does not:
- optimize parameters
- blend pools
- interpolate values dynamically
- evolve pools automatically

---

## Closing Rule

Any new parameter or pool requires:
- explicit documentation here
- version increment
- review before use

No silent expansion is permitted.