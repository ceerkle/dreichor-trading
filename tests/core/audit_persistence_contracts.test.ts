import { describe, expect, it } from "vitest";

import {
  createLogicalTime,
  createUuid,
  type AuditEvent,
  type AuditSnapshot
} from "../../src/core/index.js";

describe("Step 9 — Audit & Persistence Contracts (v1-final)", () => {
  it("exposes closed, versioned unions for AuditEvent and AuditSnapshot (compile-time)", () => {
    // Compile-time: AuditEvent must accept only documented event types.
    const e: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000a001"),
      type: "ORDER_INTENT_SKIPPED",
      version: 1,
      logicalTime: createLogicalTime(1),
      createdAtLogical: createLogicalTime(1),
      reason: "UNKNOWN"
    };
    expect(e.version).toBe(1);

    const d: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000a020"),
      type: "DECISION_EVALUATED",
      version: 1,
      logicalTime: createLogicalTime(1),
      createdAtLogical: createLogicalTime(1),
      decisionId: createUuid("00000000-0000-0000-0000-00000000a021"),
      strategyInstanceId: createUuid("00000000-0000-0000-0000-00000000a022"),
      decisionClass: "memory.contract.test@v1" as any
    };
    expect(d.type).toBe("DECISION_EVALUATED");

    const f: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000a010"),
      type: "USER_FEEDBACK_RECORDED",
      version: 1,
      logicalTime: createLogicalTime(1),
      createdAtLogical: createLogicalTime(1),
      feedbackId: createUuid("00000000-0000-0000-0000-00000000a011"),
      category: "DECISION_QUALITY",
      target: { type: "DECISION", decisionId: createUuid("00000000-0000-0000-0000-00000000a012") }
    };
    expect(f.type).toBe("USER_FEEDBACK_RECORDED");

    // Compile-time: AuditSnapshot must accept only documented snapshot types.
    const s: AuditSnapshot = {
      snapshotId: createUuid("00000000-0000-0000-0000-00000000b001"),
      type: "SHADOW_LEDGER_SNAPSHOT",
      version: 1,
      logicalTime: createLogicalTime(1),
      plane: "PAPER",
      positions: {}
    };
    expect(s.version).toBe(1);

    // @ts-expect-error - event type is a closed set in v1
    const _badEvent: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000a002"),
      type: "NOT_A_REAL_EVENT",
      version: 1,
      logicalTime: createLogicalTime(1),
      createdAtLogical: createLogicalTime(1)
    };

    // @ts-expect-error - snapshot type is a closed set in v1
    const _badSnapshot: AuditSnapshot = {
      snapshotId: createUuid("00000000-0000-0000-0000-00000000b002"),
      type: "NOT_A_REAL_SNAPSHOT",
      version: 1,
      logicalTime: createLogicalTime(1),
      plane: "PAPER",
      positions: {}
    };
  });
});

