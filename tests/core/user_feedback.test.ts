import { describe, expect, it } from "vitest";

import { createLogicalTime, createUuid } from "../../src/core/index.js";
import { deriveUserFeedbackId, recordUserFeedbackV1 } from "../../src/core/user_feedback.js";

describe("Step 10 — User Feedback Integration (v1-final)", () => {
  it("derives deterministic feedback ids from (category, target, logicalTime)", () => {
    const t = createLogicalTime(7);
    const target = { type: "DECISION" as const, decisionId: createUuid("00000000-0000-0000-0000-00000000c001") };

    const id1 = deriveUserFeedbackId("DECISION_QUALITY", target, t);
    const id2 = deriveUserFeedbackId("DECISION_QUALITY", target, t);
    expect(id1).toBe(id2);

    expect(deriveUserFeedbackId("RISK_COMFORT", target, t)).not.toBe(id1);
    expect(deriveUserFeedbackId("DECISION_QUALITY", { type: "EXECUTION", executionId: createUuid("00000000-0000-0000-0000-00000000c002") }, t)).not.toBe(id1);
    expect(deriveUserFeedbackId("DECISION_QUALITY", target, createLogicalTime(8))).not.toBe(id1);
  });

  it("records feedback and emits an AuditBase-conform USER_FEEDBACK_RECORDED event", () => {
    const logicalTime = createLogicalTime(42);
    const target = { type: "TIME_WINDOW" as const, from: createLogicalTime(10), to: createLogicalTime(20) };

    const { record, auditEvent } = recordUserFeedbackV1({
      category: "SYSTEM_BEHAVIOR",
      target,
      logicalTime,
      comment: "felt hesitant"
    });

    expect(record.version).toBe(1);
    expect(record.category).toBe("SYSTEM_BEHAVIOR");
    expect(record.target).toEqual(target);
    expect(record.logicalTime).toBe(logicalTime);
    expect(record.comment).toBe("felt hesitant");

    expect(auditEvent.type).toBe("USER_FEEDBACK_RECORDED");
    expect(auditEvent.version).toBe(1);
    expect(auditEvent.logicalTime).toBe(logicalTime);
    expect(auditEvent.createdAtLogical).toBe(logicalTime);
    expect(auditEvent.feedbackId).toBe(record.id);
    expect(auditEvent.category).toBe(record.category);
    expect(auditEvent.target).toEqual(record.target);
  });

  it("rejects syntactically invalid targets by throwing", () => {
    const logicalTime = createLogicalTime(1);
    expect(() =>
      recordUserFeedbackV1({
        category: "DECISION_QUALITY",
        // invalid UUID shape
        target: { type: "DECISION", decisionId: "not-a-uuid" as any },
        logicalTime
      })
    ).toThrow();
  });
});

