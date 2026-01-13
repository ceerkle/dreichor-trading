# Attention-Based Trading System

This repository contains a **deterministic, audit-first trading system**
designed around attention, market worthiness, and controlled execution.

This is **not** a traditional trading bot.

It is a decision system that:
- allocates capital based on comparative market attention
- rotates positions instead of optimizing exits
- prioritizes explainability and correctness over raw performance
- is built docs-first and agent-implementable

---

## Core Principles

- **Docs-first development**  
  No code exists without a corresponding, final specification.

- **Determinism by design**  
  Decisions are reproducible and replayable.

- **Strict separation of concerns**  
  RAGE / NOISE / MEATSPACE are never mixed.

- **Human-readable reasoning**  
  Decisions must be explainable without trading jargon.

---

## Repository Structure

```
/docs        → All specifications, manifests, ADRs, and plans
/src         → Implementation (created only after docs are complete)
```

The `/docs` directory is authoritative.
If code and documentation disagree, **the documentation is correct**.

---

## Status

Current phase: **Documentation complete-up**

Implementation has **not yet started**.
No code should be added until all documents listed in the documentation roadmap
are finalized and reviewed.

---

## How This Repo Is Meant to Be Used

1. Read the manifests in `/docs/manifest`
2. Read the architecture and ADRs
3. Follow the documentation roadmap
4. Only then begin implementation via an agent

---

## Non-Goals

- No performance guarantees
- No backtesting claims
- No self-learning black box behavior
- No leverage or derivatives (spot only)

---

## License & Responsibility

This project intentionally avoids claims of profitability.
Use at your own risk.

The system is designed to be defensible, not predictive.
