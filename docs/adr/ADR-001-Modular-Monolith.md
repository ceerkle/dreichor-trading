# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
The system requires strict determinism, replayability, and auditability.
Distributed systems introduce non-determinism, operational complexity,
and hidden failure modes that conflict with these goals.

## Decision
The system SHALL be implemented as a **modular monolith**:
- single deployable artifact
- strong internal module boundaries
- no network communication between core components

## Consequences
Positive:
- Deterministic execution
- Easier replay and debugging
- Strong consistency guarantees

Negative:
- Horizontal scaling is limited
- Requires architectural discipline

## Notes
This is a deliberate end-state, not an interim step toward microservices.
