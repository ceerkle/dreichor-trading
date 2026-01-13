# Cursor Agent Execution Order

## Purpose
This document defines the **exact, mandatory implementation order**
for the automated coding agent.

It removes all discretion from the agent regarding:
- what to implement next
- when to stop
- when to validate

Deviation from this order is forbidden.

---

## Core Principle

> The agent implements documents, not ideas.

Each implementation step exists solely
to satisfy an already finalized document.

---

## Preconditions

Before starting implementation:

- All documentation listed in `DOCUMENTATION_ROADMAP.md` exists
- Documentation is merged into `develop`
- No open documentation TODOs exist
- `agent/implementation` branch is created from `develop`

If any precondition is unmet, implementation must not start.

---

## Global Implementation Rules

- Follow documents in numerical order
- One slice at a time
- No speculative abstractions
- No premature optimization
- No cross-slice shortcuts

---

## Implementation Order

### Step 1 — Core Domain Types
Implements:
- Market
- Strategy
- Strategy Instance
- Decision
- OrderIntent
- Position

Validation:
- Type integrity tests
- No behavior yet

---

### Step 2 — Strategy Lifecycle State Machine
Implements:
- lifecycle states
- transitions
- invariants

Validation:
- deterministic state transition tests
- invalid transition rejection

---

### Step 3 — Attention & Worthiness Evaluation
Implements:
- attention states
- market comparison logic
- worthiness rules

Validation:
- comparative decision tests
- no absolute scoring

---

### Step 4 — Parameter Pool Selection
Implements:
- parameter pool definitions
- selection logic
- rejection handling

Validation:
- boundary enforcement tests
- pool immutability tests

---

### Step 5 — OrderIntent Creation
Implements:
- buy intent creation
- sell intent creation
- no-op decisions

Validation:
- intent correctness tests
- single-open-position enforcement

---

### Step 6 — Execution Planes
Implements:
- paper execution
- live execution interfaces (stubbed)

Validation:
- deterministic paper execution tests
- no strategy coupling

---

### Step 7 — Shadow Ledger
Implements:
- allowed outcome modeling
- deviation classification

Validation:
- paper alignment tests
- live deviation classification tests

---

### Step 8 — Safety Model
Implements:
- safety condition detection
- safety sell override

Validation:
- safety priority tests
- lifecycle interruption tests

---

### Step 9 — Decision Memory
Implements:
- memory entry aggregation
- influence modulation

Validation:
- gradual influence tests
- no logic mutation tests

---

### Step 10 — User Feedback Integration
Implements:
- feedback ingestion
- aggregation logic

Validation:
- bias resistance tests
- neutralization tests

---

### Step 11 — Persistence & Audit
Implements:
- material event persistence
- rollups
- snapshots

Validation:
- replay tests
- minimal storage tests

---

### Step 12 — Meta Layer Orchestration
Implements:
- scheduling
- gating
- execution authorization

Validation:
- blocked execution tests
- lifecycle compliance tests

---

### Step 13 — Preflight Checks
Implements:
- paper preflight
- live preflight

Validation:
- blocking behavior tests
- reason code verification

---

## Stop Conditions

The agent must stop if:

- a document cannot be satisfied exactly
- behavior ambiguity is detected
- tests contradict documentation

The agent must report the blockage explicitly.

---

## Completion Criteria

Implementation is considered complete when:

- all steps pass validation
- no undocumented behavior exists
- all tests are deterministic
- Git history matches the execution plan

---

## Closing Rule

If a step requires behavior
not defined in documentation,
implementation must stop.

Documentation must be updated first.
