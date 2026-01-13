# ADR-007: Decision Memory instead of Learning

## Status
Accepted

## Context
Self-modifying systems reduce explainability and control.

## Decision
The system SHALL implement:
- decision memory
- behavioral calibration

The system SHALL NOT:
- self-optimize parameters
- modify decision logic

## Consequences
Positive:
- Controlled adaptation
- User trust

Negative:
- Slower adaptation to new regimes

## Notes
Memory affects confidence, not logic.
