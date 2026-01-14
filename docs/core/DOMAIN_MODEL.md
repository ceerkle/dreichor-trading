# Domain Model Overview

## Purpose
This document defines the **core domain objects** of the system and
their **conceptual relationships**.

It intentionally avoids:
- implementation details
- storage concerns
- technical data types

The goal is to establish a **shared mental model**
for humans and automated agents.

---

## Domain Boundary

The domain covers:
- market observation
- decision-making
- execution intent
- execution outcome
- behavioral memory

The domain explicitly excludes:
- UI concerns
- infrastructure concerns
- exchange-specific mechanics

---

## Core Domain Objects

### Market
Represents a tradeable spot market.

Attributes:
- Base Asset
- Quote Asset
- Exchange

Properties:
- Markets are independent attention targets
- Markets do not share state

---

### Market Snapshot
A bounded observation of a market at a given logical moment.

Properties:
- Derived from market data
- Immutable once created
- Used as input for decisions

A snapshot does not imply completeness or truth.

---

### Strategy
A deterministic decision model.

Properties:
- Stateless by definition
- Evaluates market snapshots and strategy state
- Produces decisions

A strategy never executes actions.

---

### Strategy Instance
A stateful instantiation of a strategy.

Attributes:
- Strategy reference
- Internal state
- Active position (optional)

Properties:
- Operates independently
- Owns exactly one position at most
- Advances through a defined lifecycle

---

### Decision
A deterministic outcome produced by a strategy instance.

Attributes:
- Decision Class
- Reason Codes
- Timestamp (logical)

Properties:
- May result in an OrderIntent
- May explicitly result in no action
- Must be explainable

---

### OrderIntent
A declaration of intended execution.

Attributes:
- Side (buy / sell)
- Target Market
- Allocation or quantity intent

Properties:
- Expresses intent, not execution
- Immutable once created

---

### Execution
An attempt to realize an OrderIntent in an execution plane.

Attributes:
- Execution Plane
- Result (success / partial / failed)
- Fill details (if any)

Properties:
- May diverge from intent
- Is observable and auditable

---

### Position
Represents current exposure held by a strategy instance.

Attributes:
- Market
- Size
- Entry reference

Properties:
- Exists only after execution
- At most one per strategy instance

---

### Safety Condition
A detected risk condition requiring immediate action.

Properties:
- Overrides strategy decisions
- Triggers Safety Sell
- Not subject to hold time or cooldown

---

### Decision Memory
Aggregated historical record of decision behavior.

Attributes:
- Decision Classes
- Context summaries
- Outcome summaries

Properties:
- Influences behavioral calibration
- Never alters strategy logic

---

### Outcome
A retrospective classification of how a decision unfolded.

Properties:
- Qualitative
- Time-delayed
- Context-dependent

Outcomes are not rewards.

---

## Relationships (Conceptual)

- A **Strategy Instance** evaluates **Market Snapshots**
- A **Strategy Instance** produces a **Decision**
- A **Decision** may create an **OrderIntent**
- An **OrderIntent** may lead to **Execution**
- **Execution** may create or close a **Position**
- **Decisions** contribute to **Decision Memory**
- **Safety Conditions** may bypass Decisions

---

## Invariants

- Strategies never execute
- Execution never decides
- Positions do not exist without execution
- Decision Memory does not affect logic
- Safety overrides all strategy outcomes

---

## Closing Rule

If a new domain concept is introduced,
it must be added here before implementation.

No implicit domain objects are allowed.