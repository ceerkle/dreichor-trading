# Observer Endpoint Contracts — Phase 2

## Purpose

This document defines the **exact contracts** for all Observer API endpoints
introduced in Phase 2.

Each contract is:
- read-only
- deterministic
- bounded to existing runtime data
- stable once released

No endpoint defined here may:
- mutate state
- trigger execution
- introduce new computation paths

---

## General Response Rules

### HTTP Semantics

- Success: HTTP 200
- Missing data (but valid runtime): HTTP 200 with null/empty payload
- Unrecoverable runtime failure: HTTP 500
- Unauthorized access: handled at infrastructure level

### Response Shape Rules

- JSON only
- No polymorphic responses
- No implicit defaults
- Explicit nulls preferred over omission

### Ordering Rules

- Audit events are returned in persisted order
- No server-side sorting beyond file order
- Derived data preserves deterministic reducer order

---

## Runtime Endpoints

### GET /v1/observe/runtime/status

**Source**
- process.env
- runtime startup banner metadata

**Response**

- runtime_version: string
- node_version: string
- execution_plane: string
- persistence_mode: string
- snapshot_strategy: string
- safety_mode: string
- logical_time_source: string

**Notes**
- Values reflect validated startup configuration
- No live runtime state is exposed

---

## Persistence Endpoints

### GET /v1/observe/persistence/paths

**Source**
- configured filesystem mount paths
- filesystem stat calls

**Response**

- audit_events:
  - path: string
  - exists: boolean
  - size_bytes: number | null
- snapshots:
  - path: string
  - exists: boolean
  - size_bytes: number | null

**Notes**
- No directory traversal
- No file listing beyond configured roots

---

### GET /v1/observe/persistence/audit-events

**Source**
- FilesystemAuditEventStore.readAll()

**Query Parameters**
- limit (optional): number

**Response**

- events: array of AuditEvent v1 objects

**Notes**
- If limit is provided, only the last N events are returned
- Full event payloads are returned without modification

---

### GET /v1/observe/persistence/audit-events/summary

**Source**
- FilesystemAuditEventStore.readAll()

**Response**

- total_count: number
- counts_by_type: map<string, number>
- last_event_id: string | null
- last_logical_time: string | null

**Notes**
- Aggregation only; no derived semantics

---

### GET /v1/observe/persistence/snapshots/latest

**Source**
- FilesystemSnapshotStore.readLatest()

**Response**

- snapshot: ShadowLedgerSnapshot v1 | null

**Notes**
- If no snapshot exists, snapshot is null
- Only SHADOW_LEDGER_SNAPSHOT is valid

---

## Derived State Endpoints

### GET /v1/observe/derived/decision-memory

**Source**
- AuditEvents replay
- DecisionMemory reducer v1

**Response**

- decision_memory: DecisionMemoryState v1

**Notes**
- Reconstructed on-demand
- No caching required
- Identical input yields identical output

---

### GET /v1/observe/derived/shadow-ledger

**Source**
- Latest snapshot
- ShadowLedger replay logic

**Response**

- shadow_ledger:
  - plane: string
  - positions: array of PositionState

**Notes**
- If no snapshot exists, positions is empty
- No execution or safety evaluation occurs

---

## Contract Stability Rules

- Field removal is forbidden within v1
- Field addition is allowed only if optional
- Semantic changes require a new API version

---

## Error Handling

- Filesystem read failure: HTTP 500 with explicit error message
- Contract violation (unexpected data): runtime fatal error
- Partial responses are forbidden

---

## Security Boundary

- Observer endpoints assume upstream authentication
- No request-level auth logic exists in the runtime
- Observer API must not leak secrets or credentials

---

## Explicit Non-Goals

- No POST, PUT, PATCH, DELETE
- No pagination beyond simple limit