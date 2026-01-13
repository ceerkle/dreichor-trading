# TECH_STACK

## Purpose
This document describes the concrete technical environment in which the
documented architecture is implemented.

It does not introduce new behavior.

## Language & Runtime
- TypeScript
- Node.js (LTS)

## Core Principles
- Core logic lives in `/src/core`
- Core code is pure and deterministic
- No infrastructure concerns in core

## Testing
- Vitest is used for all tests
- Core tests validate:
  - construction invariants
  - equality
  - serialization stability

## Boundaries
- `/src/core` must not import from other layers
- Infrastructure code may depend on core, never the reverse

## Agent Guidance
If a behavior is not defined in documentation:
- Stop
- Request clarification
