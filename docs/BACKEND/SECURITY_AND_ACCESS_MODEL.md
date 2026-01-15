# Security and Access Model — Phase 2

## Purpose

This document defines the security and access model for the backend
during Phase 2 (Read-Only Observability).

The goal is strict access control with zero ambiguity:
- no public access
- no anonymous access
- no write capabilities
- no accidental exposure

Security is enforced at multiple layers.

---

## Security Principles

1. Default deny
2. Explicit allow
3. Zero trust at network boundaries
4. No implicit roles
5. Observability is not control

All access must be intentional, authenticated, and scoped.

---

## Network Boundary

The backend runtime is not publicly exposed.

All external access flows through:
- Cloudflare Tunnel
- Cloudflare Access

There are no open inbound ports on the server.

---

## Authentication Layer

### Cloudflare Access

All observer endpoints are protected by Cloudflare Access.

Authentication methods:
- Email OTP (browser-based access)
- Service tokens (machine-to-machine, limited use)

Unauthenticated requests never reach the runtime.

---

### Required Headers

Requests reaching the backend must include:

- CF-Access-Client-Id
- CF-Access-Client-Secret

Requests missing these headers are rejected immediately.

---

## Authorization Model

### Phase 2 Authorization Scope

There is exactly one authorization scope in Phase 2:

- OBSERVER (read-only)

No role hierarchy exists.
No per-user permissions exist.
No write permissions exist.

---

### Backend Enforcement

The backend enforces:

- Mandatory presence of Cloudflare Access headers
- Read-only endpoints only
- No mutation paths

Authorization is coarse by design.

---

## Endpoint Exposure Rules

Allowed:
- GET observer endpoints
- Derived read-only state
- Aggregated summaries

Forbidden:
- POST endpoints (except internal health if needed)
- Control commands
- Runtime mutation
- Persistence writes
- Configuration changes

Any forbidden request results in rejection.

---

## Internal vs External Access

### Internal Access (localhost)

- Used for health checks
- Used for deployment verification
- May bypass Cloudflare Access

Internal access must never be exposed externally.

---

### External Access (via Tunnel)

- Always authenticated
- Always read-only
- Always observable

No exceptions.

---

## Secrets Handling

Secrets used by the backend:
- Cloudflare Access credentials
- Database credentials (connectivity only)
- Runtime configuration values

Rules:
- No secrets are logged
- No secrets are returned via APIs
- No secrets are exposed in observer responses

---

## Logging and Audit

Security-relevant events are observable via logs only.

Phase 2 does not introduce:
- security audit events
- access logs in persistence
- user tracking

This is intentional.

---

## Failure Behavior

On any security violation:
- request is rejected
- no partial response is returned
- runtime state is unchanged

Security failures are explicit and visible.

---

## Explicit Non-Goals

The following are intentionally excluded:

- Fine-grained RBAC
- Multi-user permission models
- Token refresh APIs
- OAuth flows in backend
- User management
- Admin roles

All of the above require a future phase.

---

## Phase Constraint

The security model is frozen for Phase 2.

Any change to access scope or permissions requires:
- a new phase
- updated threat modeling
- explicit documentation