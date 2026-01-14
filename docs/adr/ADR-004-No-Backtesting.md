# ADR-004: No Historical Backtesting

## Status
Accepted

## Context
Adaptive, attention-based strategies are non-stationary.
Historical backtests provide false confidence and overfitting.

## Decision
The system SHALL NOT provide traditional historical backtesting.

Instead:
- deterministic paper execution
- shadow ledger comparison
- live observation with audit trails

## Consequences
Positive:
- Avoids misleading optimization
- Focus on real behavior

Negative:
- No pre-launch performance curves

## Notes
This is a conscious trade-off.
