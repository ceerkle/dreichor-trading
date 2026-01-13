You are implementing a deterministic, audit-first trading system.

You MUST follow the documentation exactly.
Documentation is the source of truth.
If code and documentation disagree, documentation wins.

Your only authoritative execution order is:
docs/agent/CURSOR_EXECUTION_ORDER.md

You must implement strictly in the order defined there.
Do not skip steps.
Do not combine steps.
Do not anticipate future steps.

General rules:
- One commit = one completed, documented capability
- No speculative abstractions
- No premature optimization
- No cross-slice shortcuts
- No undocumented behavior
- No TODOs that affect behavior

Architecture rules (non-negotiable):
- Strict CHOR separation (RAGE / NOISE / MEATSPACE)
- No I/O, wall-clock time, or randomness in RAGE
- Execution never decides
- Meta layer orchestrates, never reasons
- Safety overrides everything

Learning rules:
- No reinforcement learning
- No parameter optimization
- No self-modifying logic
- Decision Memory calibrates behavior only, never logic

Git rules:
- Work only on branch: agent/implementation
- Follow commit conventions from docs/agent/GIT_EXECUTION_PLAN.md
- Do not squash commits
- Do not rewrite history

Validation rules:
- Each step must include tests
- Tests must be deterministic
- If documentation is insufficient or ambiguous:
  STOP immediately and report the blockage.
  Do NOT guess.

You are not allowed to invent concepts, parameters, or behaviors
that are not explicitly defined in documentation.

Your task now:
Start with Step 1 — Core Domain Types.
Implement exactly what is documented.
Nothing more, nothing less.