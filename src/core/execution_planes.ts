/**
 * Step 6 — Execution Planes (Paper / Live)
 *
 * Source of truth:
 * - docs/execution/EXECUTION_PLANES.md
 *
 * Clarifications (provided for Step 6 implementation):
 * - filledQuantity = orderIntent.intent.value
 * - ExecutionOutcome.orderIntentId uses OrderIntent.id (no UUID migration)
 * - executionId is deterministically derived from (orderIntent.id, executionPlane, logicalTime)
 *
 * Constraints (Step 6):
 * - No lifecycle, budgets, pricing, retries, or safety logic
 * - No external I/O
 * - Logical time is provided externally; execution never advances time
 */

import type { LogicalTime, UUID } from "./value_objects.js";
import { createUuid } from "./value_objects.js";
import type { DecimalString } from "./value_objects.js";
import type { MarketId, OrderIntent, OrderIntentId } from "./domain_types.js";

/**
 * Execution Plane (v1)
 * Closed set: Paper, Live.
 */
export type ExecutionPlane = "PAPER" | "LIVE";

/**
 * Execution Status (v1) — closed set per documentation.
 */
export type ExecutionStatus = "FILLED" | "PARTIALLY_FILLED" | "FAILED";

/**
 * Execution Reason Codes (v1) — closed set per documentation.
 */
export type ExecutionReasonCode = "EXECUTION_NOT_AVAILABLE" | "EXECUTION_REJECTED";

/**
 * Execution Outcome Model (v1)
 */
export type ExecutionOutcome = Readonly<{
  executionId: UUID;
  orderIntentId: OrderIntentId;
  plane: ExecutionPlane;
  status: ExecutionStatus;
  side: "BUY" | "SELL";
  marketId: MarketId;
  filledQuantity: DecimalString;
  logicalTime: LogicalTime;
  reason?: ExecutionReasonCode;
}>;

export type ExecutionPlaneExecutor = Readonly<{
  plane: ExecutionPlane;
  execute(orderIntent: OrderIntent, logicalTime: LogicalTime): ExecutionOutcome;
}>;

/**
 * Deterministically derives a UUID-shaped identifier from:
 * - orderIntentId
 * - plane
 * - logicalTime
 *
 * NOTE: This is NOT random and contains no wall-clock time.
 */
export function deriveExecutionId(
  orderIntentId: OrderIntentId,
  plane: ExecutionPlane,
  logicalTime: LogicalTime
): UUID {
  const input = `${orderIntentId}|${plane}|${logicalTime}`;
  const h1 = fnv1a64(input);
  const h2 = fnv1a64(`salt:step6|${input}`);
  const hex = `${toHex64(h1)}${toHex64(h2)}`; // 32 hex chars
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return createUuid(uuid);
}

/**
 * Paper Execution Plane
 *
 * Deterministic Fill Rule (v1):
 * - status = FILLED
 * - filledQuantity = orderIntent.intent.value
 * - reason = undefined
 * - No partial fills
 * - No failures
 */
export const PAPER_EXECUTION: ExecutionPlaneExecutor = Object.freeze({
  plane: "PAPER",
  execute(orderIntent: OrderIntent, logicalTime: LogicalTime): ExecutionOutcome {
    const outcome: ExecutionOutcome = {
      executionId: deriveExecutionId(orderIntent.id, "PAPER", logicalTime),
      orderIntentId: orderIntent.id,
      plane: "PAPER",
      status: "FILLED",
      side: orderIntent.side,
      marketId: orderIntent.marketId,
      filledQuantity: orderIntent.intent.value,
      logicalTime
    };
    return Object.freeze(outcome);
  }
});

/**
 * Live Execution Plane Stub (v1 scope)
 *
 * For Step 6:
 * - No external I/O
 * - No exchange SDKs
 * - Deterministic success is permitted
 */
export const LIVE_EXECUTION_STUB: ExecutionPlaneExecutor = Object.freeze({
  plane: "LIVE",
  execute(orderIntent: OrderIntent, logicalTime: LogicalTime): ExecutionOutcome {
    const outcome: ExecutionOutcome = {
      executionId: deriveExecutionId(orderIntent.id, "LIVE", logicalTime),
      orderIntentId: orderIntent.id,
      plane: "LIVE",
      status: "FILLED",
      side: orderIntent.side,
      marketId: orderIntent.marketId,
      filledQuantity: orderIntent.intent.value,
      logicalTime
    };
    return Object.freeze(outcome);
  }
});

// ---- Deterministic hashing helpers (no I/O, no randomness) ----

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const MASK_64 = (1n << 64n) - 1n;

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  // String to UTF-8 bytes deterministically (no Node Buffer dependency).
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

