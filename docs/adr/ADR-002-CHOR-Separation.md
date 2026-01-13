# ADR-002: CHOR Layer Separation (RAGE / NOISE / MEATSPACE)

## Status
Accepted

## Context
Decision logic, friction modeling, and real-world execution
have fundamentally different properties and failure modes.

Mixing them causes:
- hidden time dependencies
- non-replayable behavior
- implicit trust assumptions

## Decision
The system SHALL strictly separate:
- RAGE: deterministic intent, pure functions only
- NOISE: controlled, deterministic friction
- MEATSPACE: external reality and I/O

No layer may violate the responsibilities of another.

## Consequences
Positive:
- Deterministic decisions
- Testable intent
- Clear audit boundaries

Negative:
- Increased upfront design effort

## Notes
This separation is enforced by architecture, not convention.
