import { describe, expect, it } from "vitest";

import {
  PAPER_EXECUTION,
  createDecisionClass,
  createLogicalTime,
  createUuid,
  decideAttentionWorthiness,
  initializeDecisionMemoryStateV1,
  initializeShadowLedgerState,
  initializeStrategyLifecycle,
  selectParameterPoolV1,
  transitionStrategyLifecycle,
  type AuditEvent,
  type Decision,
  type ShadowLedgerState
} from "../../../src/core/index.js";

import { InMemoryAuditEventStore, InMemorySnapshotStore } from "../../../src/runtime/persistence/index.js";
import { MetaOrchestratorV1 } from "../../../src/runtime/meta/index.js";

function makeBaseInput(overrides?: Partial<Parameters<MetaOrchestratorV1["tick"]>[0]>) {
  const logicalTime = createLogicalTime(1);
  const strategyInstanceId = createUuid("00000000-0000-0000-0000-00000000a001");

  const lifecycle0 = initializeStrategyLifecycle({
    minimumHoldTime: 1,
    cooldownDuration: 1
  });
  const lifecycle = transitionStrategyLifecycle(lifecycle0, { type: "META_TRIGGER_EVALUATION" });

  const decision: Decision = {
    decisionClass: createDecisionClass("meta.tick.test@v1"),
    reasonCodes: ["ATTENTION_SUPERIOR"],
    logicalTime
  };

  const attention = decideAttentionWorthiness({
    attentionMeaningfullyHigher: true,
    stabilityMeetsMinimum: true,
    confidenceSufficient: true,
    differencePersistsOverTime: true,
    switchingCostsJustified: true
  });

  const parameterPool = selectParameterPoolV1({ requestedPoolId: undefined }).parameterPool;

  const shadowLedger: ShadowLedgerState = initializeShadowLedgerState("PAPER");

  const base = {
    logicalTime,
    strategyInstanceId,
    executionPlane: "PAPER" as const,
    safetyGates: { haltAll: false, blockBuy: false, forceSell: false } as const,
    decision,
    lifecycle,
    attention,
    parameterPool,
    targetMarketId: "BTC-USD" as any,
    shadowLedger,
    decisionMemory: initializeDecisionMemoryStateV1()
  };

  return { ...base, ...(overrides ?? {}) };
}

describe("Step 12 — Meta Layer Orchestration (v1) — MetaOrchestratorV1", () => {
  it("führt Steps strikt in Reihenfolge aus (AuditEvent-Typen sind in Order)", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput();

    const res = orch.tick(input, {
      executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any }
    });

    const types = res.auditEvents.map((e) => e.type);
    expect(types).toEqual([
      "DECISION_EVALUATED",
      "ORDER_INTENT_CREATED",
      "SAFETY_EVALUATED",
      "EXECUTION_ATTEMPTED",
      "EXECUTION_OUTCOME_RECORDED",
      "LEDGER_UPDATED"
    ]);
  });

  it("ist deterministisch: gleiche Inputs -> gleiche Outputs (inkl. IDs/Events/Snapshot)", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput();

    const eventStore1 = new InMemoryAuditEventStore();
    const snapshotStore1 = new InMemorySnapshotStore();

    const r1 = orch.tick(input, {
      executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any },
      persistence: {
        auditEventStore: eventStore1,
        snapshotStore: snapshotStore1,
        persistShadowLedgerSnapshot: true
      }
    });

    const eventStore2 = new InMemoryAuditEventStore();
    const snapshotStore2 = new InMemorySnapshotStore();
    const r2 = orch.tick(input, {
      executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any },
      persistence: {
        auditEventStore: eventStore2,
        snapshotStore: snapshotStore2,
        persistShadowLedgerSnapshot: true
      }
    });

    expect(r1).toEqual(r2);
    expect(eventStore1.readAll()).toEqual(eventStore2.readAll());
    expect(snapshotStore1.readLatest()).toEqual(snapshotStore2.readLatest());
  });

  it("wirft bei strukturellem Fehler: plane mismatch (MetaInput vs ShadowLedgerState)", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput({
      executionPlane: "LIVE" as any
    });

    expect(() =>
      orch.tick(input, {
        executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any }
      })
    ).toThrow(/executionPlane must match ShadowLedgerState\.plane/i);
  });

  it("wirft bei strukturellem Fehler: Decision.logicalTime != MetaTickInput.logicalTime", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput({
      decision: {
        decisionClass: createDecisionClass("meta.tick.test@v1"),
        reasonCodes: ["ATTENTION_SUPERIOR"],
        logicalTime: createLogicalTime(2)
      }
    });

    expect(() =>
      orch.tick(input, {
        executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any }
      })
    ).toThrow(/Decision\.logicalTime must equal MetaTickInput\.logicalTime/i);
  });

  it("wirft bei strukturellem Fehler: fehlender Executor für plane", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput({
      executionPlane: "LIVE" as any,
      shadowLedger: initializeShadowLedgerState("LIVE" as any)
    });

    expect(() =>
      orch.tick(input, {
        executorByPlane: { PAPER: PAPER_EXECUTION } as any
      })
    ).toThrow(/Missing ExecutionPlaneExecutor/i);
  });

  it("optional Step 7: UserFeedback wird als letztes AuditEvent angehängt", () => {
    const orch = new MetaOrchestratorV1();
    const input = makeBaseInput({
      userFeedback: {
        category: "DECISION_QUALITY",
        target: { type: "DECISION", decisionId: createUuid("00000000-0000-0000-0000-00000000b001") },
        comment: "ok"
      }
    });

    const res = orch.tick(input, {
      executorByPlane: { PAPER: PAPER_EXECUTION, LIVE: PAPER_EXECUTION as any }
    });

    const last = res.auditEvents[res.auditEvents.length - 1] as AuditEvent;
    expect(last.type).toBe("USER_FEEDBACK_RECORDED");
  });
});

