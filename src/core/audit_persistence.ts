/**
 * Step 9 — Audit & Persistence Contracts (v1-final)
 *
 * Sole source of truth:
 * - docs/persistence/AUDIT_PERSISTENCE.md (v1-final)
 *
 * This module defines versioned, closed audit event and snapshot contracts.
 * No storage, IO, or runtime behavior is implemented here.
 */

import type { DecisionClass, LogicalTime, ReasonCode, UUID } from "./value_objects.js";
import type { MarketId } from "./domain_types.js";
import type { ExecutionPlane, ExecutionStatus } from "./execution_planes.js";
import type { SafetyEvaluationResult } from "./safety_model.js";
import type { ShadowLedgerPosition } from "./shadow_ledger.js";
import type { UserFeedbackCategory, UserFeedbackTarget } from "./user_feedback.js";

/**
 * Common Fields (v1)
 *
 * Notes:
 * - createdAtLogical equals logicalTime in v1 (enforced upstream; no runtime logic here)
 * - Wall-clock timestamps are forbidden
 */
export type AuditBase = Readonly<{
  id: UUID;
  type: string;
  version: 1;
  logicalTime: LogicalTime;
  createdAtLogical: LogicalTime;
}>;

// ---- Material Events (v1) ----

export type DecisionEvaluatedEvent = AuditBase &
  Readonly<{
    type: "DECISION_EVALUATED";
    strategyInstanceId: UUID;
    decisionClass: DecisionClass;
  }>;

export type OrderIntentCreatedEvent = AuditBase &
  Readonly<{
    type: "ORDER_INTENT_CREATED";
    orderIntentId: UUID;
    side: "BUY" | "SELL";
    marketId: MarketId;
  }>;

export type OrderIntentSkippedEvent = AuditBase &
  Readonly<{
    type: "ORDER_INTENT_SKIPPED";
    reason: ReasonCode;
  }>;

export type SafetyEvaluatedEvent = AuditBase &
  Readonly<{
    type: "SAFETY_EVALUATED";
    result: SafetyEvaluationResult;
  }>;

export type ExecutionAttemptedEvent = AuditBase &
  Readonly<{
    type: "EXECUTION_ATTEMPTED";
    executionId: UUID;
    plane: ExecutionPlane;
  }>;

export type ExecutionOutcomeRecordedEvent = AuditBase &
  Readonly<{
    type: "EXECUTION_OUTCOME_RECORDED";
    executionId: UUID;
    status: ExecutionStatus;
  }>;

export type LedgerUpdatedEvent = AuditBase &
  Readonly<{
    type: "LEDGER_UPDATED";
    plane: ExecutionPlane;
    marketId: MarketId;
  }>;

export type UserFeedbackRecordedEvent = AuditBase &
  Readonly<{
    type: "USER_FEEDBACK_RECORDED";
    feedbackId: UUID;
    category: UserFeedbackCategory;
    target: UserFeedbackTarget;
  }>;

/**
 * AuditEvent (closed union, v1)
 */
export type AuditEvent =
  | DecisionEvaluatedEvent
  | OrderIntentCreatedEvent
  | OrderIntentSkippedEvent
  | SafetyEvaluatedEvent
  | ExecutionAttemptedEvent
  | ExecutionOutcomeRecordedEvent
  | LedgerUpdatedEvent
  | UserFeedbackRecordedEvent;

// ---- Snapshots (v1) ----

export type ShadowLedgerSnapshot = Readonly<{
  snapshotId: UUID;
  type: "SHADOW_LEDGER_SNAPSHOT";
  version: 1;
  logicalTime: LogicalTime;
  plane: ExecutionPlane;
  positions: Readonly<Record<MarketId, ShadowLedgerPosition>>;
}>;

/**
 * AuditSnapshot (closed union, v1)
 */
export type AuditSnapshot = ShadowLedgerSnapshot;

