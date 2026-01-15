# Observer Security and Access Model — Phase 2

## Purpose

This document defines the security model for the Phase 2 Observer API.

The Observer API is strictly read-only and must be accessible only to
authorized first-party clients (UI, internal tools, CI smoke tests).

Security is enforced outside the runtime. The runtime itself remains
agnostic to identity, users, and sessions.

---

## Security Philosophy

### Core Rule

The runtime does NOT authenticate users.

It assumes that any request reaching the Observer API has already passed
all authentication and authorization checks at the infrastructure layer.

The runtime only performs:
- structural request validation
- read-only data access
- deterministic derivation of state

---

## Trust Boundary

The trust boundary is explicitly defined as:

Client  
→ Cloudflare Access  
→ Cloudflare Tunnel  
→ Runtime Observer API  

Anything beyond the Cloudflare Tunnel is considered trusted.

---

## Authentication Layer

### Cloudflare Access

Cloudflare Access is the single authentication mechanism.

Authentication methods may include:
- Email one-time passcode
- Identity provider login (future)

The runtime has no knowledge of user identity or session state.

---

## Machine-to-Machine Access

Machine clients (CI, automation) authenticate using Cloudflare Access
Service Tokens.

These tokens are:
- validated entirely by Cloudflare
- never decoded or inspected by the runtime

---

## Runtime Header Guard

### Required Headers

All Observer API requests MUST include:

- CF-Access-Client-Id
- CF-Access-Client-Secret

Requests missing either header are rejected with HTTP 401.

### Validation Rules

- Presence-only check
- No cryptographic verification
- No audience or scope parsing
- No user context extraction

This is intentional and enforced by design.

---

## Authorization Model

### Observer Scope

- Single global observer role
- No per-user permissions
- No per-endpoint authorization
- No role hierarchy

All authenticated requests have identical read access.

---

## Endpoint Guarantees

Observer endpoints guarantee that:
- No state mutation occurs
- No runtime actions are triggered
- No ticks are executed
- No safety gates are altered
- No persistence writes occur

---

## Network Exposure Rules

- Observer API is never exposed directly to the public internet
- All access must go through Cloudflare Tunnel
- No local port exposure beyond 127.0.0.1

---

## Explicit Non-Goals

The Observer API does NOT provide:
- User management
- API keys
- OAuth tokens
- Session cookies
- RBAC or ABAC
- Write or control capabilities

Any such features require a new phase and explicit security design.

---

## Phase Constraint

This security model applies exclusively to Phase 2.

Any future write, control, or governance functionality MUST:
- introduce a new security document
- explicitly redefine trust boundaries
- preserve read-only observer guarantees