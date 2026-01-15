# ADR 0002 — No Control API in Phase 2

## Status

Accepted

---

## Context

Phase 2 introduces read-only observability for the Dreichor backend.

The runtime at this stage:
- is deterministic
- is replay-driven
- has no active execution loop
- is operationally idle after startup

There is a natural temptation to:
- add start/stop controls
- trigger ticks manually
- change safety flags
- inject strategies or parameters

Introducing any of these would fundamentally change the runtime model.

---

## Decision

Phase 2 explicitly forbids **any control or mutation API**.

There will be:
- no control endpoints
- no command endpoints
- no write-capable APIs
- no execution triggers
- no runtime steering

All exposed APIs in Phase 2 are **strictly read-only**.

---

## Forbidden Capabilities

The following capabilities are explicitly forbidden in Phase 2:

- triggering MetaOrchestrator.tick(...)
- starting or stopping execution
- modifying safety gates (halt, blockBuy, forceSell)
- injecting strategies
- mutating decision memory
- mutating shadow ledger state
- forcing snapshots
- replaying state on demand
- clearing or pruning persistence
- changing environment configuration

If an API can alter system behavior, it is out of scope.

---

## Rationale

This decision enforces:

- strict phase boundaries
- preservation of Phase 1.5 guarantees
- zero operational risk during observability
- clean separation between observation and control

By forbidding control APIs, Phase 2 remains:
- safe to deploy
- easy to reason about
- impossible to misuse accidentally

---

## Relationship to ADR 0001

ADR 0001 defines **what may be observed**.

ADR 0002 defines **what must not be done**.

Together, they fully constrain Phase 2 behavior.

---

## Alternatives Considered

### Limited Control API

Rejected because:
- even minimal control breaks determinism guarantees
- it creates implicit execution paths
- it encourages unsafe operational habits

---

### Feature Flags or Soft Controls

Rejected because:
- flags are still state mutation
- observability must be side-effect free
- enforcement must be absolute, not policy-based

---

## Consequences

### Positive

- No accidental execution
- No hidden state changes
- Runtime behavior remains frozen
- Observability is provably safe

---

### Negative

- Operators cannot intervene via API
- Any control remains manual or out-of-band
- UI remains informational only

These consequences are intentional and accepted.

---

## Future Reconsideration

Control APIs may be introduced in a future phase only if:

- a new phase is declared
- new safety guarantees are defined
- execution semantics are explicitly documented
- auditability of control actions is guaranteed

---

## Closing Statement

Phase 2 is about **understanding the system**.

Control comes later — deliberately and explicitly.