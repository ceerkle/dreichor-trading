import type { AuditEvent, ShadowLedgerSnapshot } from "../../core/audit_persistence.js";
import type {
  DecisionEvaluatedEvent,
  ExecutionAttemptedEvent,
  ExecutionOutcomeRecordedEvent,
  LedgerUpdatedEvent,
  OrderIntentCreatedEvent,
  OrderIntentSkippedEvent,
  SafetyEvaluatedEvent
} from "../../core/audit_persistence.js";
import type { AttentionWorthinessDecision } from "../../core/attention_worthiness.js";
import type { Decision, MarketId, OrderIntent } from "../../core/domain_types.js";
import type { ParameterPool } from "../../core/parameter_pools.js";
import type {
  NoIntent,
  NoIntentReason,
  OrderIntentCreationOutput
} from "../../core/order_intent_creation.js";
import { createOrderIntentV1 } from "../../core/order_intent_creation.js";
import type { ExecutionOutcome, ExecutionPlane, ExecutionPlaneExecutor } from "../../core/execution_planes.js";
import type { DecisionMemoryState } from "../../core/decision_memory.js";
import { reduceDecisionMemoryV1 } from "../../core/decision_memory.js";
import type { SafetyEvaluationResult, SafetyGatesV1 } from "../../core/safety_model.js";
import { evaluateSafetyV1 } from "../../core/safety_model.js";
import type { ShadowLedgerState } from "../../core/shadow_ledger.js";
import { applyExecutionOutcome } from "../../core/shadow_ledger.js";
import type { StrategyLifecycle } from "../../core/strategy_lifecycle.js";
import { assertLifecycleInvariants } from "../../core/strategy_lifecycle.js";
import type { LogicalTime, ReasonCode, UUID } from "../../core/value_objects.js";
import { createLogicalTime } from "../../core/value_objects.js";
import type { UserFeedbackCategory, UserFeedbackTarget } from "../../core/user_feedback.js";
import { recordUserFeedbackV1 } from "../../core/user_feedback.js";
import type { AuditEventStore, SnapshotStore } from "../persistence/ports.js";
import { deriveUuidV1 } from "./deterministic_ids.js";

export type MetaUserFeedbackInputV1 = Readonly<{
  category: UserFeedbackCategory;
  target: UserFeedbackTarget;
  comment?: string;
}>;

export type MetaTickInputV1 = Readonly<{
  logicalTime: LogicalTime;
  strategyInstanceId: UUID;
  executionPlane: ExecutionPlane;
  safetyGates: SafetyGatesV1;

  // Step 1 inputs (Decision already evaluated upstream; Meta only sequences/audits)
  decision: Decision;

  // Step 2 inputs (black-box Core function requires these)
  lifecycle: StrategyLifecycle;
  attention: AttentionWorthinessDecision;
  parameterPool: ParameterPool;
  targetMarketId?: MarketId;

  // Step 3 inputs
  shadowLedger: ShadowLedgerState;

  // Step 6 inputs
  decisionMemory: DecisionMemoryState;

  // Step 7 optional
  userFeedback?: MetaUserFeedbackInputV1;
}>;

export type MetaPersistenceConfigV1 = Readonly<{
  auditEventStore?: AuditEventStore;
  snapshotStore?: SnapshotStore;
  /**
   * If true, write a ShadowLedgerSnapshot after Step 5 when an execution outcome existed.
   */
  persistShadowLedgerSnapshot?: boolean;
}>;

export type MetaTickDepsV1 = Readonly<{
  executorByPlane: Readonly<Record<ExecutionPlane, ExecutionPlaneExecutor>>;
  persistence?: MetaPersistenceConfigV1;
}>;

export type MetaTickResultV1 = Readonly<{
  decisionId: UUID;
  decision: Decision;
  orderIntent: OrderIntentCreationOutput;
  safetyResult: SafetyEvaluationResult;
  executionOutcome?: ExecutionOutcome;
  shadowLedger: ShadowLedgerState;
  decisionMemory: DecisionMemoryState;
  auditEvents: readonly AuditEvent[];
  snapshotWritten?: ShadowLedgerSnapshot;
}>;

function isNoIntent(output: OrderIntentCreationOutput): output is NoIntent {
  return (output as any).type === "NO_INTENT";
}

function isOrderIntent(output: OrderIntentCreationOutput): output is OrderIntent {
  return (output as any).side === "BUY" || (output as any).side === "SELL";
}

function mapNoIntentReasonToReasonCode(reason: NoIntentReason): ReasonCode {
  // Explicit, documented mapping layer (Meta glue):
  // Core OrderIntent returns NoIntentReason; Audit contract requires ReasonCode.
  switch (reason) {
    case "ATTENTION_NEGATIVE":
      return "ATTENTION_INSUFFICIENT";
    case "HOLD_TIME_ACTIVE":
      return "HOLD_TIME_ACTIVE";
    case "COOLDOWN_ACTIVE":
      return "COOLDOWN_ACTIVE";
    case "SAFETY_BLOCKED":
      return "SAFETY_TRIGGERED";
    case "LIFECYCLE_BLOCKED":
    case "MISSING_TARGET_MARKET":
    case "PRECONDITIONS_NOT_MET":
      return "UNKNOWN";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function deriveDecisionIdV1(input: Readonly<{
  strategyInstanceId: UUID;
  decision: Decision;
}>): UUID {
  const { strategyInstanceId, decision } = input;
  const reasonCodes = decision.reasonCodes.join(",");
  return deriveUuidV1(
    "DECISION_ID_V1",
    `${strategyInstanceId}|${decision.decisionClass}|${decision.logicalTime}|${reasonCodes}`
  );
}

function auditBase(logicalTime: LogicalTime, type: string, id: UUID) {
  // createdAtLogical equals logicalTime in v1.
  return Object.freeze({
    id,
    type,
    version: 1 as const,
    logicalTime,
    createdAtLogical: logicalTime
  });
}

function stableLedgerPositionsString(ledger: ShadowLedgerState): string {
  const keys = Object.keys(ledger.positions).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const p = (ledger.positions as any)[k];
    // Canonical serialization: fixed field order.
    parts.push(
      `${k}:{marketId=${p.marketId},quantity=${p.quantity},isOpen=${p.isOpen},lastExecutionId=${p.lastExecutionId}}`
    );
  }
  return parts.join("|");
}

function makeShadowLedgerSnapshotV1(input: Readonly<{
  logicalTime: LogicalTime;
  ledger: ShadowLedgerState;
}>): ShadowLedgerSnapshot {
  const payload = `plane=${input.ledger.plane}|t=${input.logicalTime}|pos=${stableLedgerPositionsString(
    input.ledger
  )}`;
  const snapshotId = deriveUuidV1("SHADOW_LEDGER_SNAPSHOT_V1", payload);
  return Object.freeze({
    snapshotId,
    type: "SHADOW_LEDGER_SNAPSHOT",
    version: 1,
    logicalTime: input.logicalTime,
    plane: input.ledger.plane,
    positions: input.ledger.positions
  });
}

/**
 * Step 12 — Meta Layer Orchestration (v1)
 *
 * Deterministische, strikt geordnete Tick-Pipeline.
 * Keine Heuristiken, keine Retries, keine Defaults.
 */
export class MetaOrchestratorV1 {
  tick(input: MetaTickInputV1, deps: MetaTickDepsV1): MetaTickResultV1 {
    // ---- Structural validation (fail-fast) ----
    createLogicalTime(input.logicalTime);
    if (input.decision.logicalTime !== input.logicalTime) {
      throw new Error("Decision.logicalTime must equal MetaTickInput.logicalTime");
    }
    if (input.shadowLedger.plane !== input.executionPlane) {
      throw new Error("MetaTickInput.executionPlane must match ShadowLedgerState.plane");
    }
    assertLifecycleInvariants(input.lifecycle);

    const executor = deps.executorByPlane[input.executionPlane];
    if (!executor) {
      throw new Error(`Missing ExecutionPlaneExecutor for plane=${input.executionPlane}`);
    }
    if (executor.plane !== input.executionPlane) {
      throw new Error("ExecutionPlaneExecutor.plane must match MetaTickInput.executionPlane");
    }

    // ---- Step 1: Decision Evaluation (audit) ----
    const decisionId = deriveDecisionIdV1({
      strategyInstanceId: input.strategyInstanceId,
      decision: input.decision
    });
    const decisionEventId = deriveUuidV1(
      "AUDIT_EVENT_V1",
      `DECISION_EVALUATED|${decisionId}|t=${input.logicalTime}`
    );
    const decisionEvaluated: DecisionEvaluatedEvent = Object.freeze({
      ...auditBase(input.logicalTime, "DECISION_EVALUATED", decisionEventId),
      decisionId,
      strategyInstanceId: input.strategyInstanceId,
      decisionClass: input.decision.decisionClass
    });

    // ---- Step 2: Order Intent Creation ----
    const orderIntent = createOrderIntentV1({
      strategyInstanceId: input.strategyInstanceId,
      lifecycle: input.lifecycle,
      attention: input.attention,
      parameterPool: input.parameterPool,
      targetMarketId: input.targetMarketId,
      safetyGates: { blockBuy: input.safetyGates.blockBuy, forceSell: input.safetyGates.forceSell },
      logicalTime: input.logicalTime
    });

    let orderIntentAudit: OrderIntentCreatedEvent | OrderIntentSkippedEvent;
    if (isOrderIntent(orderIntent)) {
      const id = deriveUuidV1(
        "AUDIT_EVENT_V1",
        `ORDER_INTENT_CREATED|${decisionId}|${orderIntent.id}|t=${input.logicalTime}`
      );
      orderIntentAudit = Object.freeze({
        ...auditBase(input.logicalTime, "ORDER_INTENT_CREATED", id),
        // NOTE: Core OrderIntentId is not UUID-shaped; audit contract uses UUID branding.
        // We treat it as opaque and do not validate/convert.
        orderIntentId: orderIntent.id as any,
        side: orderIntent.side,
        marketId: orderIntent.marketId
      });
    } else {
      const reasonCode = mapNoIntentReasonToReasonCode(orderIntent.reason);
      const id = deriveUuidV1(
        "AUDIT_EVENT_V1",
        `ORDER_INTENT_SKIPPED|${decisionId}|${orderIntent.reason}|t=${input.logicalTime}`
      );
      orderIntentAudit = Object.freeze({
        ...auditBase(input.logicalTime, "ORDER_INTENT_SKIPPED", id),
        reason: reasonCode
      });
    }

    // ---- Step 3: Safety Evaluation ----
    const safetyResult = evaluateSafetyV1({
      proposed: orderIntent,
      ledger: input.shadowLedger,
      plane: input.executionPlane,
      gates: input.safetyGates,
      logicalTime: input.logicalTime
    });
    const safetyEventId = deriveUuidV1(
      "AUDIT_EVENT_V1",
      `SAFETY_EVALUATED|${decisionId}|${safetyResult.type}|t=${input.logicalTime}`
    );
    const safetyEvaluated: SafetyEvaluatedEvent = Object.freeze({
      ...auditBase(input.logicalTime, "SAFETY_EVALUATED", safetyEventId),
      decisionId,
      result: safetyResult
    });

    // ---- Step 4: Execution (only if allowed) ----
    let executionOutcome: ExecutionOutcome | undefined = undefined;
    let executionAttempted: ExecutionAttemptedEvent | undefined = undefined;
    let executionOutcomeRecorded: ExecutionOutcomeRecordedEvent | undefined = undefined;

    const shouldExecute = isOrderIntent(orderIntent) && safetyResult.type === "ALLOW";
    if (shouldExecute) {
      executionOutcome = executor.execute(orderIntent, input.logicalTime);

      const attemptedId = deriveUuidV1(
        "AUDIT_EVENT_V1",
        `EXECUTION_ATTEMPTED|${decisionId}|${executionOutcome.executionId}|t=${input.logicalTime}`
      );
      executionAttempted = Object.freeze({
        ...auditBase(input.logicalTime, "EXECUTION_ATTEMPTED", attemptedId),
        decisionId,
        executionId: executionOutcome.executionId,
        plane: executionOutcome.plane
      });

      const recordedId = deriveUuidV1(
        "AUDIT_EVENT_V1",
        `EXECUTION_OUTCOME_RECORDED|${decisionId}|${executionOutcome.executionId}|${executionOutcome.status}|t=${input.logicalTime}`
      );
      executionOutcomeRecorded = Object.freeze({
        ...auditBase(input.logicalTime, "EXECUTION_OUTCOME_RECORDED", recordedId),
        decisionId,
        executionId: executionOutcome.executionId,
        status: executionOutcome.status
      });
    }

    // ---- Step 5: Shadow Ledger Update ----
    let nextLedger = input.shadowLedger;
    let ledgerUpdated: LedgerUpdatedEvent | undefined = undefined;
    if (executionOutcome) {
      nextLedger = applyExecutionOutcome(input.shadowLedger, executionOutcome).nextState;
      const ledgerEventId = deriveUuidV1(
        "AUDIT_EVENT_V1",
        `LEDGER_UPDATED|${decisionId}|${executionOutcome.executionId}|t=${input.logicalTime}`
      );
      ledgerUpdated = Object.freeze({
        ...auditBase(input.logicalTime, "LEDGER_UPDATED", ledgerEventId),
        plane: executionOutcome.plane,
        marketId: executionOutcome.marketId
      });
    }

    // ---- Collect AuditEvents (strict step order) ----
    const auditEvents: AuditEvent[] = [];
    auditEvents.push(decisionEvaluated);
    auditEvents.push(orderIntentAudit);
    auditEvents.push(safetyEvaluated);
    if (executionAttempted) auditEvents.push(executionAttempted);
    if (executionOutcomeRecorded) auditEvents.push(executionOutcomeRecorded);
    if (ledgerUpdated) auditEvents.push(ledgerUpdated);

    // ---- Step 6: Decision Memory Update (from AuditEvents) ----
    let nextDecisionMemory = input.decisionMemory;
    // Decision Memory is an observational reducer over a strict subset of AuditEvents:
    // Core reducer requires an explicit decisionId on every AuditEvent it ingests.
    for (const e of auditEvents) {
      if (!("decisionId" in e)) continue;
      nextDecisionMemory = reduceDecisionMemoryV1(nextDecisionMemory, e);
    }

    // ---- Step 7: User Feedback Recording (optional) ----
    if (input.userFeedback) {
      const recording = recordUserFeedbackV1({
        category: input.userFeedback.category,
        target: input.userFeedback.target,
        logicalTime: input.logicalTime,
        comment: input.userFeedback.comment
      });
      auditEvents.push(recording.auditEvent);
    }

    // ---- Step 8: Persistence (optional; side-effect via ports) ----
    let snapshotWritten: ShadowLedgerSnapshot | undefined = undefined;
    const persistence = deps.persistence;
    if (persistence?.auditEventStore) {
      for (const e of auditEvents) persistence.auditEventStore.append(e);
    }
    if (
      persistence?.persistShadowLedgerSnapshot === true &&
      persistence.snapshotStore &&
      executionOutcome
    ) {
      snapshotWritten = makeShadowLedgerSnapshotV1({ logicalTime: input.logicalTime, ledger: nextLedger });
      persistence.snapshotStore.write(snapshotWritten);
    }

    return Object.freeze({
      decisionId,
      decision: input.decision,
      orderIntent,
      safetyResult,
      ...(executionOutcome ? { executionOutcome } : {}),
      shadowLedger: nextLedger,
      decisionMemory: nextDecisionMemory,
      auditEvents: Object.freeze([...auditEvents]),
      ...(snapshotWritten ? { snapshotWritten } : {})
    });
  }
}

