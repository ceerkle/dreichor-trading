# Infrastructure Runtime Layout

## Purpose

This document defines the **authoritative physical and logical layout**
of the Dreichor runtime infrastructure on a single server.

It specifies:
- directory structure
- running processes
- container layout
- DEV / PROD separation
- responsibility boundaries

If scripts, workflows, or assumptions disagree with this document,
**this document wins**.

---

## High-Level Overview

The Dreichor system runs on a **single server** with **strict logical separation**
between environments.

There are **three main layers**:

1. Deploy Agents (control plane)
2. Runtime Containers (execution plane)
3. Host Services (database, filesystem)

---

## Base Directory

All infrastructure lives under:

/opt/dreichor/

This directory is owned by the server operator and is not managed by GitHub.

---

## Environment Separation

Two environments exist:

- `dev`
- `prod`

They are strictly separated at:
- filesystem level
- process level
- database level
- network / access level

---

## Directory Layout

/opt/dreichor/
├── dev/
│   ├── deploy-agent/
│   │   ├── agent.js
│   │   ├── package.json
│   │   ├── node_modules/
│   │   └── .env
│   ├── volumes/
│   │   ├── audit-events/
│   │   └── snapshots/
│   └── logs/              (optional / future)
│
├── prod/
│   ├── deploy-agent/
│   │   ├── agent.js
│   │   ├── package.json
│   │   ├── node_modules/
│   │   └── .env
│   ├── volumes/
│   │   ├── audit-events/
│   │   └── snapshots/
│   └── logs/              (optional / future)

---

## Deploy Agents

### Purpose

Deploy agents are **long-running Node.js services** responsible for:

- authenticating deploy requests (via Cloudflare Access)
- pulling Docker images
- starting/stopping runtime containers
- enforcing environment boundaries

They are **not part of the runtime**.

---

### Processes

Each environment runs exactly **one deploy agent**:

| Environment | Path | Port |
|-----------|------|------|
| dev | `/opt/dreichor/dev/deploy-agent/agent.js` | 3005 |
| prod | `/opt/dreichor/prod/deploy-agent/agent.js` | 3006 |

They are managed via `systemd`.

---

### Responsibilities

Deploy agents:
- own the container name
- own volume mounts
- own execution-plane enforcement
- do NOT own runtime logic

---

## Runtime Containers

### Naming Convention

Each environment runs **exactly one runtime container**:

| Environment | Container Name |
|-----------|----------------|
| dev | `dreichor-runtime-dev` |
| prod | `dreichor-runtime-prod` |

Container names MUST NOT collide.

---

### Image Source

Runtime images are pulled from:

ghcr.io/ceerkle/dreichor-trading/runtime:

No `latest` tag is allowed in PROD.

---

### Volume Mounts

Each runtime container mounts exactly two host directories:

| Host Path | Container Path | Purpose |
|--------|----------------|--------|
| `/opt/dreichor/<env>/volumes/audit-events` | `/var/lib/dreichor/audit-events` | Audit log persistence |
| `/opt/dreichor/<env>/volumes/snapshots` | `/var/lib/dreichor/snapshots` | Snapshot persistence |

No other volumes are allowed.

---

## Database (Host Service)

PostgreSQL runs as a **system service** on the host.

- NOT containerized
- NOT managed by deploy agent
- Shared PostgreSQL instance
- Separate databases per environment

| Environment | Database |
|-----------|----------|
| dev | `dreichor_dev` |
| prod | `dreichor_prod` |

Access is via `DATABASE_URL`.

---

## Networking

- Runtime containers do NOT expose ports publicly
- Access to runtime APIs is internal (localhost / docker bridge)
- External access is always mediated by Cloudflare Tunnel

---

## Cloudflare Integration

- Cloudflare Tunnel routes traffic to:
  - deploy agents
  - runtime APIs (observer)
  - UI

- Deploy agents bind to `127.0.0.1` only
- Cloudflare Access enforces authentication

---

## Non-Goals

- No multi-server clustering
- No dynamic container scaling
- No shared volumes between environments
- No cross-environment visibility

---

## Operational Guarantees

This layout guarantees:
- no accidental DEV/PROD crossover
- deterministic persistence
- reproducible deployments
- safe future extension (live trading, UI control)

---

## Status

- Applies to Phase 1.5 / Phase 2
- Compatible with Phase UI-2 deployment model
- Database migrations handled separately