# Phase 1.5 Charter — Infrastructure-Ready Core Runtime

## Purpose

Phase 1.5 marks the transition from a **purely architectural / core-complete system**
to a **production-near, infrastructure-ready runtime**.

The goal is **not feature completeness**, but **operational correctness, auditability,
and safety**.

Phase 1.5 answers exactly one question:

> Can this system run on a real server, deterministically, without surprises?

---

## What Phase 1.5 Guarantees

### Deterministic Core
- All decision logic is deterministic
- LogicalTime is the only notion of time
- Replayability is guaranteed

### Single Runtime
- One runtime process
- One Meta Orchestrator
- One Shadow Ledger per execution plane

### Explicit Safety & Control
- Kill Switch (`halt`, `flatten`)
- Safety gates are enforced centrally
- No hidden retries or background behavior

### Best-Effort Persistence (Visible)
- Runtime never crashes due to persistence failure
- All persistence failures are surfaced as audit events
- Replay correctness is still guaranteed

### Auditability
- All material actions emit audit events
- Decision Memory is derived, read-only, and replayable
- Shadow Ledger is the sole source of truth for positions

---

## What Phase 1.5 Explicitly Does NOT Do

Phase 1.5 is **not**:

- High availability (HA)
- Horizontal scaling
- Multi-runtime coordination
- Automatic governance or self-modification
- Strategy editing or parameter tuning at runtime
- Machine learning or adaptive optimization
- Capital-at-risk mainnet trading

---

## Operational Scope

### Allowed
- Start / Stop runtime
- Observe all states (read-only)
- Manually trigger kill switches
- Run in Paper Execution Plane
- Persist audit logs and snapshots

### Disallowed
- Live capital execution
- Automatic recovery logic
- Strategy mutation
- Parameter pool mutation
- Hidden defaults or implicit behavior

---

## Environment & Configuration Rules

- All configuration is explicit
- `.env.schema` defines required variables
- Startup fails fast if configuration is incomplete
- No silent fallbacks

---

## CI / Quality Bar

CI guarantees:
- `npm test` passes
- `npm run build` succeeds
- Determinism is preserved

CI does **not**:
- Deploy
- Modify environments
- Run migrations automatically

---

## Deployment Target

Phase 1.5 targets:
- Single Hetzner server
- Containerized runtime
- External Postgres database
- Manual deployment

---

## Exit Criteria for Phase 1.5

Phase 1.5 is considered complete when:
- Runtime can be started and stopped reliably
- Replay produces identical results
- All safety paths are observable
- No undocumented behavior exists

---

## Closing Rule

Any change that:
- affects determinism
- alters execution order
- introduces implicit behavior

**requires explicit documentation and review.**

Phase 1.5 exists to make the system boring, predictable, and trustworthy.
