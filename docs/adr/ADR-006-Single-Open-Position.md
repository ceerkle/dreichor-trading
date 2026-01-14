# ADR-006: Single Open Position per Strategy

## Status
Accepted

## Context
Multiple concurrent positions introduce complexity,
implicit leverage, and unclear responsibility.

## Decision
Each strategy instance SHALL maintain:
- at most one open position at any time

New positions require:
- completion of previous sell
- cooldown expiration

## Consequences
Positive:
- Simplified state
- Clear capital allocation

Negative:
- Lower theoretical throughput

## Notes
This is a stability-first decision.
