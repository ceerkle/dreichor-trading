# Shadow Ledger Specification

## Purpose
This document defines the **Shadow Ledger**, a deterministic reference model
describing what execution outcomes were *allowed* to happen
given an OrderIntent and known constraints.

The Shadow Ledger exists to:
- detect execution deviations
- classify discrepancies
- support audit and replay

It does not simulate markets.
It defines **expectation boundaries**.

---

## Concept Overview

The Shadow Ledger represents a parallel, theoretical ledger that records:

- intended actions
- allowed execution outcomes
- invariant constraints

It is evaluated **after execution**, not before.

---

## Shadow vs. Real Ledger

- **Real Ledger**
  - Records what actually happened
  - Includes fills, fees, timestamps

- **Shadow Ledger**
  - Records what *could* have happened
  - Ignores randomness
  - Uses deterministic rules

The two ledgers are compared, not merged.

---

## Inputs

The Shadow Ledger is derived from:

- OrderIntent
- Execution Plane rules
- Market constraints (precision, minimums)
- Known fee models

No live market data is used.

---

## Allowed Outcomes

For each OrderIntent, the Shadow Ledger defines:

- Allowed fill ranges
- Allowed partial execution
- Allowed failure reasons

Anything outside these bounds is a deviation.

---

## Deviation Classification

Deviations are classified into categories, such as:

- Latency Deviation
- Partial Fill Deviation
- Fee Deviation
- Precision Deviation
- Order Rejection Deviation

Deviation classes are finite and named.

---

## Determinism

Given identical inputs, the Shadow Ledger must:

- produce identical allowed outcomes
- produce identical deviation classifications

Determinism is mandatory.

---

## Persistence Rules

The system persists:

- Shadow expectations (compact form)
- Deviation classification (if any)

Raw execution spam is not stored.

---

## Interaction with Paper Execution

In the Paper Execution Plane:

- Shadow Ledger and Real Ledger are expected to align
- Deviations indicate implementation errors

Any deviation is considered a bug.

---

## Interaction with Live Execution

In the Live Execution Plane:

- Deviations are expected
- Deviations are informational
- Deviations do not trigger strategy changes

Deviation trends may inform governance.

---

## Non-Goals

The Shadow Ledger does not:
- predict execution quality
- optimize orders
- prevent execution
- influence strategy logic

---

## Closing Rule

Any new execution rule or constraint
must be reflected in the Shadow Ledger.

No silent divergence is permitted.
