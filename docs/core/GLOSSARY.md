# Glossary & Core Definitions

## Purpose
This glossary defines all **authoritative terms** used throughout the system.

Every term in this document has **one meaning only**.
If a term is unclear, overloaded, or ambiguous, the system design is considered incomplete.

This document is binding for:
- documentation
- implementation
- audits
- automated agents

---

## Attention
A qualitative measure of how strongly a market currently attracts collective interest.

Attention is:
- relative (only meaningful when compared to other markets)
- stateful (changes over time)
- derived from observable market behavior

Attention is **not** a price, indicator, or signal.

---

## Worthiness
A comparative assessment answering the question:

> “Does this market currently deserve attention more than others?”

Worthiness incorporates attention, stability, and context.
A market can be worthy without rising.
A rising market can be unworthy.

---

## Market
A tradeable spot instrument defined by:
- base asset
- quote asset
- exchange

Markets are treated as independent attention targets.

---

## Strategy
A deterministic decision model that evaluates markets
and produces intents based on defined semantics.

A strategy does **not** execute trades.
It only decides.

---

## Strategy Instance
A concrete, stateful instantiation of a strategy.

Each strategy instance:
- operates independently
- has its own state
- controls at most one open position

---

## Decision
A deterministic outcome of a strategy evaluation.

A decision may:
- create an OrderIntent
- explicitly choose no action

Every decision must be explainable.

---

## Decision Class
A categorical grouping of similar decisions,
used for memory and behavioral calibration.

Decision classes are finite, named, and versioned.

---

## OrderIntent
A declaration of intended action produced by a strategy.

OrderIntents describe:
- desired side (buy/sell)
- market
- quantity or allocation intent

OrderIntents do not imply execution.

---

## Execution
The act of attempting to realize an OrderIntent in reality.

Execution may succeed, partially succeed, or fail.

---

## Execution Plane
A controlled environment in which execution occurs.

Defined planes:
- Paper: deterministic, simulated fills
- Live: real exchange interaction

Execution planes never alter decision logic.

---

## Position
The current held exposure of a strategy instance in a market.

A position exists only after execution.

---

## Hold Time
A minimum duration during which a position must be held
before it may be rotated away for non-safety reasons.

---

## Cooldown
A mandatory waiting period after a position is closed.

Cooldown prevents immediate re-entry
and reduces reactive churn.

---

## Safety Sell
An immediate exit triggered by unacceptable risk conditions.

Safety sells:
- override attention and worthiness
- ignore hold time and cooldown
- are risk controls, not market decisions

---

## Decision Memory
A structured, aggregated record of past decision classes
and their observed outcomes.

Decision memory influences behavioral calibration,
not strategy logic.

---

## Outcome
A retrospective observation of how a decision unfolded.

Outcomes are qualitative and context-dependent,
not profit-based scores.

---

## Meta Layer
The orchestration layer outside CHOR.

The Meta Layer:
- controls lifecycle and execution flow
- enforces preflight and gating
- does not make market decisions

---

## RAGE
The deterministic intent layer.

RAGE characteristics:
- pure functions only
- no I/O
- no wall clock
- no randomness

---

## NOISE
The controlled friction layer.

NOISE models:
- slippage
- latency
- partial effects

NOISE remains deterministic.

---

## MEATSPACE
The external reality layer.

MEATSPACE includes:
- exchanges
- networks
- clocks
- secrets

MEATSPACE is inherently non-deterministic.

---

## Shadow Ledger
A theoretical execution ledger describing
what execution outcomes were allowed to happen.

Used to classify deviations between expectation and reality.

---

## Governance
An external, formal system that determines
whether decisions are allowed to act under uncertainty.

Governance does not modify decisions.
It evaluates admissibility.

---

## Determinism
The property that identical inputs
produce identical outputs.

Determinism is a core invariant of this system.

---

## Replay
The ability to reconstruct decisions and outcomes
from persisted state and events.

Replay must not rely on intent or interpretation.

---

## Auditability
The property that decisions and executions
can be inspected, explained, and justified after the fact.

---

## Closing Rule

If a term is used in documentation or code
that is not defined here,
this glossary must be updated first.

No exceptions.
