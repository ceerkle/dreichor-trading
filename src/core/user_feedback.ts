/**
 * Step 10 — User Feedback Integration (v1-final)
 *
 * Sole source of truth:
 * - docs/memory/USER_FEEDBACK.md (v1-final)
 *
 * Constraints:
 * - Deterministic recording + audit event production
 * - No interpretation, scoring, aggregation, or action
 * - No IO / persistence
 */

import type { LogicalTime, UUID } from "./value_objects.js";
import { createLogicalTime, createUuid } from "./value_objects.js";
import type { AuditBase, UserFeedbackRecordedEvent } from "./audit_persistence.js";

export type UserFeedbackCategory = "DECISION_QUALITY" | "RISK_COMFORT" | "SYSTEM_BEHAVIOR";

export type UserFeedbackTarget =
  | Readonly<{ type: "DECISION"; decisionId: UUID }>
  | Readonly<{ type: "EXECUTION"; executionId: UUID }>
  | Readonly<{ type: "TIME_WINDOW"; from: LogicalTime; to: LogicalTime }>;

export type UserFeedbackRecord = Readonly<{
  id: UUID;
  version: 1;
  category: UserFeedbackCategory;
  target: UserFeedbackTarget;
  comment?: string;
  logicalTime: LogicalTime;
}>;

function serializeTarget(target: UserFeedbackTarget): string {
  switch (target.type) {
    case "DECISION":
      return `DECISION|${target.decisionId}`;
    case "EXECUTION":
      return `EXECUTION|${target.executionId}`;
    case "TIME_WINDOW":
      return `TIME_WINDOW|${target.from}|${target.to}`;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

/**
 * Deterministic feedback id derivation (UUID-shaped), derived from:
 * - category
 * - target
 * - logicalTime
 */
export function deriveUserFeedbackId(
  category: UserFeedbackCategory,
  target: UserFeedbackTarget,
  logicalTime: LogicalTime
): UUID {
  const input = `${category}|${serializeTarget(target)}|${logicalTime}`;
  const h1 = fnv1a64(input);
  const h2 = fnv1a64(`salt:step10|${input}`);
  const hex = `${toHex64(h1)}${toHex64(h2)}`; // 32 hex chars
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return createUuid(uuid);
}

function assertSyntacticallyValidTarget(target: UserFeedbackTarget): void {
  // "does not exist syntactically" is interpreted as:
  // - referenced UUID fields are valid UUID strings
  // - LogicalTime fields are valid LogicalTime values
  switch (target.type) {
    case "DECISION":
      createUuid(target.decisionId);
      return;
    case "EXECUTION":
      createUuid(target.executionId);
      return;
    case "TIME_WINDOW":
      createLogicalTime(target.from);
      createLogicalTime(target.to);
      return;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

export type UserFeedbackRecording = Readonly<{
  record: UserFeedbackRecord;
  auditEvent: UserFeedbackRecordedEvent;
}>;

/**
 * Records feedback deterministically and emits the corresponding audit event.
 *
 * Validation (v1):
 * - target must be syntactically valid
 * - logicalTime must be present (validated as LogicalTime)
 *
 * Rejection is represented by throwing an Error (pure; caller decides handling).
 */
export function recordUserFeedbackV1(input: Readonly<{
  category: UserFeedbackCategory;
  target: UserFeedbackTarget;
  logicalTime: LogicalTime;
  comment?: string;
}>): UserFeedbackRecording {
  const { category, target, logicalTime, comment } = input;

  // Validate syntactic presence/shape.
  createLogicalTime(logicalTime);
  assertSyntacticallyValidTarget(target);
  if (comment !== undefined && typeof comment !== "string") {
    throw new Error("comment must be a string when provided");
  }

  const id = deriveUserFeedbackId(category, target, logicalTime);
  const record: UserFeedbackRecord = Object.freeze({
    id,
    version: 1,
    category,
    target,
    ...(comment === undefined ? {} : { comment }),
    logicalTime
  });

  // Audit envelope fields:
  // - createdAtLogical equals logicalTime in v1 (AUDIT_PERSISTENCE.md)
  // - Use deterministic id equal to feedbackId for v1 simplicity.
  const auditBase: AuditBase = Object.freeze({
    id,
    type: "USER_FEEDBACK_RECORDED",
    version: 1,
    logicalTime,
    createdAtLogical: logicalTime
  });

  const auditEvent: UserFeedbackRecordedEvent = Object.freeze({
    ...auditBase,
    type: "USER_FEEDBACK_RECORDED",
    feedbackId: id,
    category,
    target
  });

  return Object.freeze({ record, auditEvent });
}

// ---- Deterministic hashing helpers (no I/O, no randomness) ----

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const MASK_64 = (1n << 64n) - 1n;

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash;
}

function toHex64(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

