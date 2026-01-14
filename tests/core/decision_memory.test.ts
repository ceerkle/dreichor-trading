import { describe, expect, it } from "vitest";

import {
  createDecisionClass,
  createLogicalTime,
  createUuid,
  type AuditEvent,
  type UserFeedbackRecord
} from "../../src/core/index.js";
import { initializeDecisionMemoryStateV1, reduceDecisionMemoryV1 } from "../../src/core/decision_memory.js";

function reduceAll(inputs: ReadonlyArray<AuditEvent | UserFeedbackRecord>) {
  let state = initializeDecisionMemoryStateV1();
  for (const i of inputs) state = reduceDecisionMemoryV1(state, i);
  return state;
}

describe("Step 9 — Decision Memory (v1-final)", () => {
  it("creates an entry only on DecisionEvaluatedEvent and aggregates execution/safety/feedback deterministically", () => {
    const decisionId = createUuid("00000000-0000-0000-0000-00000000d001");
    const t1 = createLogicalTime(1);
    const t2 = createLogicalTime(2);

    const decisionEvaluated: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d010"),
      type: "DECISION_EVALUATED",
      version: 1,
      logicalTime: t1,
      createdAtLogical: t1,
      decisionId,
      strategyInstanceId: createUuid("00000000-0000-0000-0000-00000000d011"),
      decisionClass: createDecisionClass("memory.observe.test@v1")
    };

    const safety: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d020"),
      type: "SAFETY_EVALUATED",
      version: 1,
      logicalTime: t2,
      createdAtLogical: t2,
      decisionId,
      result: { type: "BLOCK_BUY", reason: "BUY_BLOCKED" }
    };

    const execOutcome: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d030"),
      type: "EXECUTION_OUTCOME_RECORDED",
      version: 1,
      logicalTime: t2,
      createdAtLogical: t2,
      decisionId,
      executionId: createUuid("00000000-0000-0000-0000-00000000d031"),
      status: "FILLED"
    };

    const feedback: UserFeedbackRecord = {
      id: createUuid("00000000-0000-0000-0000-00000000d040"),
      version: 1,
      category: "DECISION_QUALITY",
      target: { type: "DECISION", decisionId },
      logicalTime: t2,
      comment: "looks good"
    };

    const state = reduceAll([decisionEvaluated, safety, execOutcome, feedback]);
    const entry = state.entries[decisionId];
    expect(entry.decisionId).toBe(decisionId);
    expect(entry.decisionClass).toBe(decisionEvaluated.decisionClass);
    expect(entry.firstSeenLogicalTime).toBe(t1);

    expect(entry.safety.evaluationsObserved).toBe(1);
    expect(entry.safety.blockedCount).toBe(1);
    expect(entry.safety.forcedSellCount).toBe(0);
    expect(entry.safety.lastSafetyResult).toEqual(safety.result);

    expect(entry.execution.executionsObserved).toBe(1);
    expect(entry.execution.filledCount).toBe(1);
    expect(entry.execution.failedCount).toBe(0);
    expect(entry.execution.lastExecutionStatus).toBe("FILLED");

    expect(entry.feedback.feedbackCount).toBe(1);
    expect(entry.feedback.categories.DECISION_QUALITY).toBe(1);
    expect(entry.feedback.categories.RISK_COMFORT).toBe(0);
    expect(entry.feedback.categories.SYSTEM_BEHAVIOR).toBe(0);
  });

  it("is replay-stable for identical ordered inputs", () => {
    const decisionId = createUuid("00000000-0000-0000-0000-00000000d101");
    const t = createLogicalTime(1);

    const inputs: ReadonlyArray<AuditEvent | UserFeedbackRecord> = [
      {
        id: createUuid("00000000-0000-0000-0000-00000000d110"),
        type: "DECISION_EVALUATED",
        version: 1,
        logicalTime: t,
        createdAtLogical: t,
        decisionId,
        strategyInstanceId: createUuid("00000000-0000-0000-0000-00000000d111"),
        decisionClass: createDecisionClass("memory.replay.test@v1")
      },
      {
        id: createUuid("00000000-0000-0000-0000-00000000d120"),
        type: "EXECUTION_OUTCOME_RECORDED",
        version: 1,
        logicalTime: t,
        createdAtLogical: t,
        decisionId,
        executionId: createUuid("00000000-0000-0000-0000-00000000d121"),
        status: "FAILED"
      }
    ];

    expect(reduceAll(inputs)).toEqual(reduceAll(inputs));
  });

  it("enforces idempotence: duplicate input id -> no-op", () => {
    const decisionId = createUuid("00000000-0000-0000-0000-00000000d201");
    const t = createLogicalTime(1);

    const e: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d210"),
      type: "DECISION_EVALUATED",
      version: 1,
      logicalTime: t,
      createdAtLogical: t,
      decisionId,
      strategyInstanceId: createUuid("00000000-0000-0000-0000-00000000d211"),
      decisionClass: createDecisionClass("memory.idempotent.test@v1")
    };

    const s0 = initializeDecisionMemoryStateV1();
    const s1 = reduceDecisionMemoryV1(s0, e);
    const s2 = reduceDecisionMemoryV1(s1, e); // same id
    expect(s2).toBe(s1);
  });

  it("throws on structural errors: audit event without decisionId", () => {
    const t = createLogicalTime(1);
    const bad: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d301"),
      type: "ORDER_INTENT_SKIPPED",
      version: 1,
      logicalTime: t,
      createdAtLogical: t,
      reason: "UNKNOWN"
    };
    expect(() => reduceDecisionMemoryV1(initializeDecisionMemoryStateV1(), bad)).toThrow();
  });

  it("throws on structural errors: referenced decisionId missing", () => {
    const t = createLogicalTime(1);
    const decisionId = createUuid("00000000-0000-0000-0000-00000000d401");
    const safety: AuditEvent = {
      id: createUuid("00000000-0000-0000-0000-00000000d402"),
      type: "SAFETY_EVALUATED",
      version: 1,
      logicalTime: t,
      createdAtLogical: t,
      decisionId,
      result: { type: "ALLOW" }
    };
    expect(() => reduceDecisionMemoryV1(initializeDecisionMemoryStateV1(), safety)).toThrow();
  });

  it("throws on structural errors: UserFeedbackRecord not targeting DECISION", () => {
    const t = createLogicalTime(1);
    const feedback: UserFeedbackRecord = {
      id: createUuid("00000000-0000-0000-0000-00000000d501"),
      version: 1,
      category: "SYSTEM_BEHAVIOR",
      target: { type: "TIME_WINDOW", from: createLogicalTime(1), to: createLogicalTime(2) },
      logicalTime: t
    };
    expect(() => reduceDecisionMemoryV1(initializeDecisionMemoryStateV1(), feedback)).toThrow();
  });
});

