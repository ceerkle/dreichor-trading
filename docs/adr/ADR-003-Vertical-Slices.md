# ADR-003: Vertical Slice Architecture

## Status
Accepted

## Context
The system must evolve without destabilizing existing behavior.
Feature coupling is a primary source of regressions.

## Decision
The system SHALL be structured into **vertical slices**:
- each slice owns a capability end-to-end
- slices do not depend on each other
- communication occurs via explicit contracts and Meta orchestration

## Consequences
Positive:
- Localized changes
- Independent evolution
- Clear ownership

Negative:
- Requires careful boundary definition

## Notes
Slices are orthogonal to CHOR layers.
