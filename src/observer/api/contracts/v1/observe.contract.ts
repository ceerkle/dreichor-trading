/**
 * Phase 2 — Observer API Contracts (v1)
 *
 * Docs-first, frozen contract surface for:
 * - backend implementation (read-only observer runtime)
 * - future read-only UI
 *
 * Rules:
 * - contracts only (no runtime logic, no IO, no imports)
 * - JSON response shapes only
 * - explicit nulls preferred over omission
 * - no control/command concepts
 */

// -----------------------------
// Shared primitives (v1)
// -----------------------------

/** UUID serialized as a string. */
export type UUID = string;

/**
 * LogicalTime (v1)
 * - monotonically increasing logical counter
 * - no wall-clock semantics
 *
 * Serialized as a string in observer contracts (see last_logical_time: string | null).
 */
export type LogicalTime = string;

/** Market identifier serialized as a string. */
export type MarketId = string;

/** Opaque decimal string (no unit / precision semantics in v1 contracts). */
export type DecimalString = string;

/** Execution plane as configured (env schema uses lowercase literals). */
export type ExecutionPlaneV1 = "paper" | "live";

/** Execution status (v1, closed set). */
export type ExecutionStatusV1 = "FILLED" | "PARTIALLY_FILLED" | "FAILED";

/** Execution reason code (v1, closed set). */
export type ExecutionReasonCodeV1 = "EXECUTION_NOT_AVAILABLE" | "EXECUTION_REJECTED";

/**
 * DecisionClass (v1)
 * - stable, versioned identifier
 * - semantics are defined outside the Observer API
 */
export type DecisionClassV1 = string;

/** ReasonCode (v1, closed set). */
export type ReasonCodeV1 =
  | "UNKNOWN"
  | "ATTENTION_SUPERIOR"
  | "ATTENTION_INSUFFICIENT"
  | "STABILITY_INSUFFICIENT"
  | "HOLD_TIME_ACTIVE"
  | "COOLDOWN_ACTIVE"
  | "SAFETY_TRIGGERED"
  | "PREFLIGHT_BLOCKED";

/** User feedback category (v1, closed set). */
export type UserFeedbackCategoryV1 = "DECISION_QUALITY" | "RISK_COMFORT" | "SYSTEM_BEHAVIOR";

/**
 * User feedback target (v1).
 * Union is used only to model a closed, serialized shape (no runtime behavior implied).
 */
export type UserFeedbackTargetV1 =
  | { type: "DECISION"; decisionId: UUID }
  | { type: "EXECUTION"; executionId: UUID }
  | { type: "TIME_WINDOW"; from: LogicalTime; to: LogicalTime };

// -----------------------------
// Runtime status endpoint (v1)
// -----------------------------

/**
 * GET /v1/observe/runtime/status
 *
 * Static, startup-time configuration metadata only.
 * No lifecycle phase/history and no environment record in v1.
 */
export interface ObserveRuntimeStatusResponseV1 {
  runtime_version: string;
  node_version: string;
  execution_plane: string;
  persistence_mode: string;
  snapshot_strategy: string;
  safety_mode: string;
  logical_time_source: string;
}

// -----------------------------
// Persistence endpoints (v1)
// -----------------------------

/** Filesystem path inspection result. */
export interface ObservePathInspectionV1 {
  path: string;
  exists: boolean;
  /** Null when size is not available (e.g. non-existent). */
  size_bytes: number | null;
}

/**
 * GET /v1/observe/persistence/paths
 *
 * Only configured roots; no traversal, no directory listing.
 */
export interface ObservePersistencePathsResponseV1 {
  audit_events: ObservePathInspectionV1;
  snapshots: ObservePathInspectionV1;
}

/**
 * Audit record base envelope (v1).
 * Common fields shared by all audit events.
 */
export interface AuditBaseV1 {
  id: UUID;
  type: string;
  version: 1;
  logicalTime: LogicalTime;
  /**
   * In v1, equals logicalTime.
   * Explicitly included as a separate field for schema stability.
   */
  createdAtLogical: LogicalTime;
}

export interface DecisionEvaluatedEventV1 extends AuditBaseV1 {
  type: "DECISION_EVALUATED";
  decisionId: UUID;
  strategyInstanceId: UUID;
  decisionClass: DecisionClassV1;
}

export interface OrderIntentCreatedEventV1 extends AuditBaseV1 {
  type: "ORDER_INTENT_CREATED";
  orderIntentId: UUID;
  side: "BUY" | "SELL";
  marketId: MarketId;
}

export interface OrderIntentSkippedEventV1 extends AuditBaseV1 {
  type: "ORDER_INTENT_SKIPPED";
  reason: ReasonCodeV1;
}

/** Safety evaluation result (v1). */
export type SafetyEvaluationResultV1 =
  | { type: "ALLOW" }
  | { type: "BLOCK_BUY"; reason: SafetyReasonV1 }
  | { type: "FORCE_SELL"; reason: SafetyReasonV1 }
  | { type: "HALT"; reason: SafetyReasonV1 };

/** Safety reason (v1, closed set). */
export type SafetyReasonV1 = "HALT_ALL_ACTIVE" | "BUY_BLOCKED" | "FORCE_SELL_ACTIVE" | "POSITION_ALREADY_OPEN";

export interface SafetyEvaluatedEventV1 extends AuditBaseV1 {
  type: "SAFETY_EVALUATED";
  decisionId: UUID;
  result: SafetyEvaluationResultV1;
}

export interface ExecutionAttemptedEventV1 extends AuditBaseV1 {
  type: "EXECUTION_ATTEMPTED";
  decisionId: UUID;
  executionId: UUID;
  plane: ExecutionPlaneV1;
}

export interface ExecutionOutcomeRecordedEventV1 extends AuditBaseV1 {
  type: "EXECUTION_OUTCOME_RECORDED";
  decisionId: UUID;
  executionId: UUID;
  status: ExecutionStatusV1;
}

export interface LedgerUpdatedEventV1 extends AuditBaseV1 {
  type: "LEDGER_UPDATED";
  plane: ExecutionPlaneV1;
  marketId: MarketId;
}

export interface UserFeedbackRecordedEventV1 extends AuditBaseV1 {
  type: "USER_FEEDBACK_RECORDED";
  feedbackId: UUID;
  category: UserFeedbackCategoryV1;
  target: UserFeedbackTargetV1;
}

/**
 * AuditEvent (v1, closed union).
 * Union is used only to model the persisted, typed event stream.
 */
export type AuditEventV1 =
  | DecisionEvaluatedEventV1
  | OrderIntentCreatedEventV1
  | OrderIntentSkippedEventV1
  | SafetyEvaluatedEventV1
  | ExecutionAttemptedEventV1
  | ExecutionOutcomeRecordedEventV1
  | LedgerUpdatedEventV1
  | UserFeedbackRecordedEventV1;

/**
 * GET /v1/observe/persistence/audit-events
 *
 * Query:
 * - limit (optional): returns only the last N events when provided.
 */
export interface ObservePersistenceAuditEventsRequestV1 {
  limit: number | null;
}

export interface ObservePersistenceAuditEventsResponseV1 {
  /** Ordered, append-only (persisted order). */
  events: AuditEventV1[];
}

/**
 * GET /v1/observe/persistence/audit-events/summary
 *
 * Aggregate counts only; no derived semantics.
 */
export interface ObservePersistenceAuditEventsSummaryResponseV1 {
  total_count: number;
  counts_by_type: Record<string, number>;
  last_event_id: string | null;
  last_logical_time: string | null;
}

// -----------------------------
// Snapshots (v1)
// -----------------------------

/**
 * Shadow Ledger position (v1).
 * Minimal state without pricing / valuation semantics.
 */
export interface ShadowLedgerPositionV1 {
  marketId: MarketId;
  quantity: DecimalString;
  isOpen: boolean;
  lastExecutionId: UUID;
}

/**
 * ShadowLedger snapshot (v1).
 * Persisted as-is; used for restoring Shadow Ledger state.
 */
export interface ShadowLedgerSnapshotV1 {
  snapshotId: UUID;
  type: "SHADOW_LEDGER_SNAPSHOT";
  version: 1;
  logicalTime: LogicalTime;
  plane: ExecutionPlaneV1;
  positions: Record<MarketId, ShadowLedgerPositionV1>;
}

/**
 * GET /v1/observe/persistence/snapshots/latest
 *
 * Only the latest snapshot is returned; null when none exists.
 */
export interface ObservePersistenceSnapshotsLatestResponseV1 {
  snapshot: ShadowLedgerSnapshotV1 | null;
}

// -----------------------------
// Derived state endpoints (v1)
// -----------------------------

/**
 * Decision Memory entry (v1).
 * Deterministically reduced from the persisted audit stream.
 */
export interface DecisionMemoryEntryV1 {
  decisionId: UUID;
  decisionClass: DecisionClassV1;
  firstSeenLogicalTime: LogicalTime;
  execution: DecisionExecutionSummaryV1;
  safety: DecisionSafetySummaryV1;
  feedback: DecisionFeedbackSummaryV1;
}

export interface DecisionExecutionSummaryV1 {
  executionsObserved: number;
  filledCount: number;
  failedCount: number;
  /** Explicit null when no execution status has been observed yet. */
  lastExecutionStatus: ExecutionStatusV1 | null;
}

export interface DecisionSafetySummaryV1 {
  evaluationsObserved: number;
  blockedCount: number;
  forcedSellCount: number;
  /** Explicit null when no safety result has been observed yet. */
  lastSafetyResult: SafetyEvaluationResultV1 | null;
}

export interface DecisionFeedbackSummaryV1 {
  feedbackCount: number;
  categories: Record<UserFeedbackCategoryV1, number>;
}

export interface DecisionMemoryStateV1 {
  version: 1;
  entries: Record<UUID, DecisionMemoryEntryV1>;
  /** Set-like map used for reducer idempotence. */
  seenInputIds: Record<UUID, true>;
}

/**
 * GET /v1/observe/derived/decision-memory
 *
 * Reconstructed on-demand via deterministic replay/reduction.
 */
export interface ObserveDerivedDecisionMemoryResponseV1 {
  decision_memory: DecisionMemoryStateV1;
}

/**
 * Observer-facing PositionState for derived Shadow Ledger (v1).
 * Must remain minimal and free of trading semantics.
 */
export type PositionStateV1 = ShadowLedgerPositionV1;

export interface ShadowLedgerStateV1 {
  plane: string;
  positions: PositionStateV1[];
}

/**
 * GET /v1/observe/derived/shadow-ledger
 *
 * If no snapshot exists, positions is empty.
 */
export interface ObserveDerivedShadowLedgerResponseV1 {
  shadow_ledger: ShadowLedgerStateV1;
}

