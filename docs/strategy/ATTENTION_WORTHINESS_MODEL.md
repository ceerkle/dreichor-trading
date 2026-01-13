# Attention & Worthiness Model

## Purpose
This document defines how markets are **compared**, **ranked**, and
evaluated for rotation decisions.

It formalizes what it means for a market to be:
- interesting
- more worthy than another
- stable enough to justify a switch

This model is qualitative and comparative by design.
It avoids numeric optimization.

---

## Core Principles

- Markets are compared, not scored in isolation
- Attention precedes price interpretation
- Stability is required before action
- Switching is a deliberate decision, not a reflex

---

## Attention

### Definition
Attention describes how strongly a market currently captures
collective interest.

Attention is inferred from:
- activity intensity
- persistence of interest
- coherence of movement

Attention is:
- relative
- stateful
- time-dependent

Attention is **not**:
- a trading signal
- a buy or sell trigger
- a guarantee of continuation

---

## Worthiness

### Definition
Worthiness answers a single question:

> “Does this market deserve capital allocation more than others?”

Worthiness combines:
- attention
- stability
- contextual suitability

Worthiness is always comparative.

---

## Attention States

Markets may be classified into coarse attention states:

- Dormant
- Emerging
- Active
- Overheated
- Fading

States are descriptive, not prescriptive.

---

## Stability

### Definition
Stability describes how consistent attention and behavior
have been over a defined window.

Stability is required for:
- entering a new position
- rotating away from an existing one

High attention without stability is insufficient.

---

## Confidence

Confidence represents how certain the system is
about its current attention and worthiness assessment.

Confidence is influenced by:
- consistency of observations
- absence of conflicting signals
- decision memory calibration

Low confidence increases hesitation.

---

## Market Comparison

Markets are compared pairwise or within a candidate set.

A market may be considered **better** only if:

- its attention is meaningfully higher
- its stability meets minimum requirements
- confidence is sufficient
- switching costs are justified

If these conditions are not met,
no rotation occurs.

---

## Switching Threshold

A rotation is permitted only when:

- the target market is clearly more worthy
- the difference persists over time
- the expected benefit outweighs switching costs

Marginal improvements are ignored.

---

## Interaction with Hold Time

- Hold Time blocks rotation regardless of worthiness
- Worthiness evaluation continues during Hold Time
- Rotation decisions may be prepared but not executed

---

## Interaction with Cooldown

- During Cooldown, markets may be observed
- No entry decisions are allowed
- Worthiness assessments are informational only

---

## Safety Override

Safety conditions bypass:
- attention
- worthiness
- stability
- confidence

Safety is orthogonal to this model.

---

## Non-Goals

This model does not:
- predict price
- optimize profit
- rank markets absolutely
- adapt parameters autonomously

---

## Closing Rule

If a new interpretation of “better market” is introduced,
it must be defined here before implementation.

No implicit comparison logic is allowed.