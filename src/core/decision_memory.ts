/**
 * Step 9 — Decision Memory (v1-final)
 *
 * Sole source of truth:
 * - docs/memory/DECISION_MEMORY.md (v1-final)
 *
 * Constraints:
 * - Deterministic, replayable, observational only
 * - No IO / persistence
 * - MUST NOT influence decisions or execution
 */

import type { DecisionClass, LogicalTime, UUID } from "./value_objects.js";
import type { ExecutionStatus } from "./execution_planes.js";
import type { SafetyEvaluationResult } from "./safety_model.js";
import type { AuditEvent } from "./audit_persistence.js";
import type { UserFeedbackCategory, UserFeedbackRecord } from "./user_feedback.js";

export type DecisionExecutionSummary = Readonly<{
  executionsObserved: number;
  filledCount: number;
  failedCount: number;
  lastExecutionStatus?: ExecutionStatus;
}>;

export type DecisionSafetySummary = Readonly<{
  evaluationsObserved: number;
  blockedCount: number;
  forcedSellCount: number;
  lastSafetyResult?: SafetyEvaluationResult;
}>;

export type DecisionFeedbackSummary = Readonly<{
  feedbackCount: number;
  categories: Readonly<Record<UserFeedbackCategory, number>>;
}>;

export type DecisionMemoryEntry = Readonly<{
  decisionId: UUID;
  decisionClass: DecisionClass;
  firstSeenLogicalTime: LogicalTime;
  execution: DecisionExecutionSummary;
  safety: DecisionSafetySummary;
  feedback: DecisionFeedbackSummary;
}>;

export type DecisionMemoryState = Readonly<{
  version: 1;
  entries: Readonly<Record<UUID, DecisionMemoryEntry>>;
  seenInputIds: Readonly<Record<UUID, true>>;
}>;

function initExecutionSummary(): DecisionExecutionSummary {
  return Object.freeze({
    executionsObserved: 0,
    filledCount: 0,
    failedCount: 0
  });
}

function initSafetySummary(): DecisionSafetySummary {
  return Object.freeze({
    evaluationsObserved: 0,
    blockedCount: 0,
    forcedSellCount: 0
  });
}

function initFeedbackCategories(): Record<UserFeedbackCategory, number> {
  return Object.freeze({
    DECISION_QUALITY: 0,
    RISK_COMFORT: 0,
    SYSTEM_BEHAVIOR: 0
  });
}

function initFeedbackSummary(): DecisionFeedbackSummary {
  return Object.freeze({
    feedbackCount: 0,
    categories: initFeedbackCategories()
  });
}

export function initializeDecisionMemoryStateV1(): DecisionMemoryState {
  return Object.freeze({
    version: 1,
    entries: Object.freeze({}),
    seenInputIds: Object.freeze({})
  });
}

function isAuditEvent(input: AuditEvent | UserFeedbackRecord): input is AuditEvent {
  return typeof (input as any).type === "string";
}

function inputId(input: AuditEvent | UserFeedbackRecord): UUID {
  return (input as any).id as UUID;
}

function markSeen(prev: DecisionMemoryState, id: UUID): DecisionMemoryState {
  if (prev.seenInputIds[id] === true) return prev;
  return Object.freeze({
    version: 1,
    entries: prev.entries,
    seenInputIds: Object.freeze({ ...prev.seenInputIds, [id]: true })
  });
}

function getDecisionIdFromFeedback(record: UserFeedbackRecord): UUID {
  const t = record.target;
  if (t.type !== "DECISION") {
    throw new Error("UserFeedbackRecord must target a DECISION for Decision Memory");
  }
  return t.decisionId;
}

function getDecisionIdFromAuditEvent(event: AuditEvent): UUID {
  // Decision Memory requires explicit decisionId on audit events used for aggregation.
  if (!("decisionId" in event)) {
    throw new Error("AuditEvent without decisionId is invalid for Decision Memory");
  }
  return (event as any).decisionId as UUID;
}

function isDecisionEvaluatedEvent(event: AuditEvent): event is Extract<AuditEvent, { type: "DECISION_EVALUATED" }> {
  return event.type === "DECISION_EVALUATED";
}

function updateExecutionSummary(
  prev: DecisionExecutionSummary,
  status: ExecutionStatus
): DecisionExecutionSummary {
  const executionsObserved = prev.executionsObserved + 1;
  const filledCount = prev.filledCount + (status === "FILLED" ? 1 : 0);
  const failedCount = prev.failedCount + (status === "FAILED" ? 1 : 0);
  return Object.freeze({
    executionsObserved,
    filledCount,
    failedCount,
    lastExecutionStatus: status
  });
}

function updateSafetySummary(
  prev: DecisionSafetySummary,
  result: SafetyEvaluationResult
): DecisionSafetySummary {
  const evaluationsObserved = prev.evaluationsObserved + 1;
  const blockedCount =
    prev.blockedCount + (result.type === "BLOCK_BUY" || result.type === "HALT" ? 1 : 0);
  const forcedSellCount = prev.forcedSellCount + (result.type === "FORCE_SELL" ? 1 : 0);
  return Object.freeze({
    evaluationsObserved,
    blockedCount,
    forcedSellCount,
    lastSafetyResult: result
  });
}

function updateFeedbackSummary(
  prev: DecisionFeedbackSummary,
  category: UserFeedbackCategory
): DecisionFeedbackSummary {
  const nextCategories = Object.freeze({
    ...prev.categories,
    [category]: (prev.categories[category] ?? 0) + 1
  }) as Record<UserFeedbackCategory, number>;

  return Object.freeze({
    feedbackCount: prev.feedbackCount + 1,
    categories: nextCategories
  });
}

function updateEntry(
  entry: DecisionMemoryEntry,
  input: AuditEvent | UserFeedbackRecord
): DecisionMemoryEntry {
  if (!isAuditEvent(input)) {
    // UserFeedbackRecord
    return Object.freeze({
      ...entry,
      feedback: updateFeedbackSummary(entry.feedback, input.category)
    });
  }

  switch (input.type) {
    case "EXECUTION_OUTCOME_RECORDED":
      return Object.freeze({
        ...entry,
        execution: updateExecutionSummary(entry.execution, input.status)
      });
    case "SAFETY_EVALUATED":
      return Object.freeze({
        ...entry,
        safety: updateSafetySummary(entry.safety, input.result)
      });
    case "EXECUTION_ATTEMPTED":
      // Not summarized in v1; still must be accepted and idempotence-tracked.
      return entry;
    case "DECISION_EVALUATED":
      // Entry creation is handled elsewhere; if encountered for existing entry, do not mutate.
      return entry;
    default: {
      // Any other audit event either lacks decisionId (must throw earlier) or is out of scope.
      return entry;
    }
  }
}

/**
 * Pure, deterministic reducer (v1).
 */
export function reduceDecisionMemoryV1(
  prev: DecisionMemoryState,
  input: AuditEvent | UserFeedbackRecord
): DecisionMemoryState {
  // Idempotence rule (checked first).
  const id = inputId(input);
  if (prev.seenInputIds[id] === true) return prev;

  // Validate and apply.
  if (isAuditEvent(input)) {
    if (!("decisionId" in input)) {
      throw new Error("AuditEvent without decisionId is invalid for Decision Memory");
    }

    if (isDecisionEvaluatedEvent(input)) {
      const decisionId = input.decisionId;
      const existing = prev.entries[decisionId];
      const nextSeen = Object.freeze({ ...prev.seenInputIds, [id]: true });
      if (existing) {
        // Entry already exists; do not mutate (observational, deterministic).
        return Object.freeze({ version: 1, entries: prev.entries, seenInputIds: nextSeen });
      }

      const entry: DecisionMemoryEntry = Object.freeze({
        decisionId,
        decisionClass: input.decisionClass,
        firstSeenLogicalTime: input.logicalTime,
        execution: initExecutionSummary(),
        safety: initSafetySummary(),
        feedback: initFeedbackSummary()
      });

      return Object.freeze({
        version: 1,
        entries: Object.freeze({ ...prev.entries, [decisionId]: entry }),
        seenInputIds: nextSeen
      });
    }

    const decisionId = getDecisionIdFromAuditEvent(input);
    const entry = prev.entries[decisionId];
    if (!entry) {
      throw new Error("Referenced decisionId has no DecisionMemoryEntry");
    }

    const updated = updateEntry(entry, input);
    return Object.freeze({
      version: 1,
      entries:
        updated === entry
          ? prev.entries
          : Object.freeze({ ...prev.entries, [decisionId]: updated }),
      seenInputIds: Object.freeze({ ...prev.seenInputIds, [id]: true })
    });
  }

  // UserFeedbackRecord path
  const decisionId = getDecisionIdFromFeedback(input);
  const entry = prev.entries[decisionId];
  if (!entry) {
    throw new Error("Referenced decisionId has no DecisionMemoryEntry");
  }

  const updated = updateEntry(entry, input);
  return Object.freeze({
    version: 1,
    entries: Object.freeze({ ...prev.entries, [decisionId]: updated }),
    seenInputIds: Object.freeze({ ...prev.seenInputIds, [id]: true })
  });
}

