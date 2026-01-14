# GitHub Actions Model — Phase 1.7

## Purpose

This document defines how the system is built, deployed, and operated
via GitHub Actions in Phase 1.7.

The goal is to achieve:
- reproducible builds
- manual, explicit deployments
- zero SSH access to the server
- full operator control

This model is infrastructure-only.
It does not modify core or runtime behavior.

---

## Core Principles

- One operator (human)
- Manual deployment only
- CI builds artifacts
- CD is explicit and review-driven
- No implicit automation
- No background runners on the server

---

## Execution Model

GitHub Actions is the only automation layer.

Actions are responsible for:
- building container images
- running tests
- pushing artifacts
- deploying containers via remote triggers

The server does NOT:
- pull from git
- run CI
- hold secrets in the repository

---

## Environments (v1)

Two environments are defined:

- dev
- prod

Rules:
- environments are isolated
- secrets are scoped per environment
- deployment is triggered manually per environment
- no promotion automation exists

---

## Build Workflow (CI)

The build workflow MUST:
- run npm test
- run npm run build
- build a runtime container image
- tag the image with:
  - git SHA
  - semantic tag (e.g. phase-1.5, phase-1.7)

The build workflow MUST NOT:
- deploy
- access runtime secrets
- start containers

Artifacts are immutable once built.

---

## Deployment Workflow (CD)

Deployment is manual and operator-triggered.

The deployment workflow MUST:
- require explicit environment selection (dev or prod)
- pull a specific image tag
- inject secrets via GitHub Secrets
- start or restart containers remotely

The deployment workflow MUST NOT:
- auto-deploy on push
- infer environment
- deploy multiple versions at once

---

## Server Interaction Model

The server is accessed via:
- Cloudflare Tunnel
- GitHub Action remote commands

Rules:
- no SSH login
- no manual container manipulation
- no state changes outside workflows

---

## Secrets Model

Secrets:
- are stored only in GitHub Environments
- are injected at deploy time
- are never logged
- are never committed

Examples:
- DATABASE_URL
- POSTGRES_PASSWORD
- CLOUDFLARE_TUNNEL_TOKEN

Secret rotation is manual.

---

## Observability

Deployment MUST provide:
- workflow logs
- container startup logs
- explicit failure reasons

No dashboards or metrics are required in Phase 1.7.

---

## Non-Goals (Phase 1.7)

This model does NOT include:
- auto-scaling
- Kubernetes
- canary deployments
- rollbacks
- secret managers
- UI deployment
- websocket orchestration

---

## Closing Rule

Any change to CI/CD behavior requires:
- update to this document
- explicit review
- operator approval

GitHub Actions MUST remain boring, explicit, and predictable.