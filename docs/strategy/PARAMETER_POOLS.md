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

## Authoritative Parameter Pools (v1)

The following parameter pools are **authoritative** for version v1.

This list is **closed**.
Any extension requires a new ADR.

### Pool Catalog
- **cautious@v1** (DEFAULT)
- **balanced@v1**
- **assertive@v1**

Rules:
- Exactly one pool MUST be marked as default.
- Pool identifiers are stable and versioned.
- No implicit pools are allowed.

---

## Formal Parameter Schema (Step 4)

For Step 4, parameters are treated as **opaque configuration values**.

They are **not interpreted**, compared, optimized, or validated semantically at this stage.

All parameter pools MUST conform to the following schema:

StrategyParameterSet {
  holdTime: DecimalString
  cooldownTime: DecimalString
  switchingSensitivity: DecimalString
  stabilityRequirement: DecimalString
}

Rules:
- All keys are mandatory.
- No additional keys are allowed.
- All values MUST be valid `DecimalString` values.
- No units, bounds, or thresholds are interpreted in Step 4.

Boundary enforcement in Step 4 means:
- Missing key → invalid
- Unknown key → invalid
- Invalid type → invalid

It does NOT mean numeric range checking.

---

## Pool Selection

Pool selection occurs during Evaluation.

Selection input:

ParameterSelectionContext {
  requestedPoolId?: string
}

Selection rules:
1. If a `requestedPoolId` is provided and valid → select it.
2. If a `requestedPoolId` is provided but invalid → fallback to default pool.
3. If no `requestedPoolId` is provided → select default pool.

Rules:
- Only one pool may be active at a time.
- Pool selection must be explicit.
- No ranking, scoring, or automatic switching is allowed.
- Pool changes are part of the Decision output.

---

## Parameter Selection Decision (Audit Output)

Every parameter selection MUST be recorded explicitly.

ParameterSelectionDecision {
  selectedPoolId: string
  effectiveParameters: StrategyParameterSet
  rejectedPoolId?: string
  rejectionReason?: ParameterSelectionRejectionReason
}

### Rejection Reasons (v1)

The following rejection reasons are authoritative:
- `UNKNOWN_POOL`
- `INVALID_SCHEMA`

This set is **closed** for v1.

---

## Edgecase Role

Edgecases may:
- recommend a pool
- recommend contextual modifiers within a pool

Edgecases may NOT:
- define new parameters
- exceed pool boundaries
- persist hidden state

Edgecases are advisory only.

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