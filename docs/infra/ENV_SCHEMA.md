# Environment Variable Schema (Phase 1.5)

This document defines all environment variables required to run the system
in Phase 1.5.

It is the single source of truth for runtime configuration.

No variable may be assumed.
No variable may have an implicit default.
Missing or invalid variables MUST cause startup failure.

---

## Core Rules

- All configuration is injected via environment variables
- No configuration is read from files (except mounted secrets, if specified)
- Secrets MUST NOT be committed
- Runtime MUST validate this schema on startup

---

## Runtime Identity

### NODE_ENV (required)

Allowed values:
  NODE_ENV=production | staging | development

Purpose:
- Controls runtime mode
- Affects logging verbosity only
- MUST NOT change decision behavior

---

### RUNTIME_INSTANCE_ID (required)

Format:
  RUNTIME_INSTANCE_ID=<uuid>

Purpose:
- Unique identifier of this runtime instance
- Used for audit attribution
- MUST be stable across restarts of the same deployment

---

## Logical Time

### LOGICAL_TIME_SOURCE (required)

Allowed values:
  LOGICAL_TIME_SOURCE=marketdata | manual

Purpose:
- Defines how logical time advances
- marketdata: logical time increments per market data tick
- manual: logical time injected externally (tests / replay)

---

## Persistence (Required)

Persistence MUST be available at startup.
If not, runtime MUST refuse to start.

### DATABASE_URL (required)

Format:
  DATABASE_URL=postgres://user:password@host:5432/dbname

Purpose:
- Primary persistence store
- Source of replay truth

---

### PERSISTENCE_MODE (required)

Allowed values:
  PERSISTENCE_MODE=postgres

Notes:
- Only postgres is valid in Phase 1.5
- In-memory persistence is forbidden in production

---

### SNAPSHOT_STRATEGY (required)

Allowed values:
  SNAPSHOT_STRATEGY=on-ledger-update | manual

Purpose:
- Controls when snapshots are persisted
- on-ledger-update: snapshot after each Shadow Ledger update
- manual: snapshots only via explicit trigger

---

## Execution Plane

### EXECUTION_PLANE (required)

Allowed values:
  EXECUTION_PLANE=paper | live

Rules:
- live MUST NOT be used without explicit review
- Plane selection is audited

---

## Exchange Configuration (Phase 1.5)

### EXCHANGE_PROVIDER (required)

Allowed values:
  EXCHANGE_PROVIDER=binance

Notes:
- Only binance is allowed in Phase 1.5
- Spot-only trading

---

### BINANCE_API_KEY (conditional)

Format:
  BINANCE_API_KEY=***

Rules:
- REQUIRED if EXECUTION_PLANE=live
- MUST be absent in paper mode

---

### BINANCE_API_SECRET (conditional)

Format:
  BINANCE_API_SECRET=***

Rules:
- REQUIRED if EXECUTION_PLANE=live
- MUST be absent in paper mode

---

## Safety & Governance

### SAFETY_MODE (required)

Allowed values:
  SAFETY_MODE=normal | halt | flatten

Purpose:
- Global safety gate
- halt: blocks BUY
- flatten: allows forced SELL only

---

## Logging & Observability

### LOG_LEVEL (required)

Allowed values:
  LOG_LEVEL=debug | info | warn | error

Rules:
- Logging MUST be structured
- No sensitive data may be logged

---

### ENABLE_AUDIT_LOGGING (required)

Allowed values:
  ENABLE_AUDIT_LOGGING=true | false

Rules:
- MUST be true in production
- If false, runtime MUST warn loudly

---

## Validation Rules (Mandatory)

The runtime MUST fail startup if:
- any required variable is missing
- any variable has an invalid value
- live execution is configured without credentials
- persistence is unavailable

---

## Explicit Non-Goals

This schema does NOT include:
- UI configuration
- reverse proxy configuration
- metrics exporters
- secret managers
- multi-node coordination

---

## Closing Rule

Any change to runtime configuration requires:
- an update to this document
- review before implementation

No implicit configuration is allowed.