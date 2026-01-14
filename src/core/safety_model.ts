/**
 * Step 8 — Safety Model (Execution-side) (v1-final)
 *
 * Sole source of truth:
 * - docs/execution/SAFETY_MODEL.md (v1-final)
 *
 * Constraints:
 * - Pure, deterministic evaluation
 * - No execution, persistence, or state mutation
 */

import type { LogicalTime } from "./value_objects.js";
import type { ExecutionPlane } from "./execution_planes.js";
import type { OrderIntent } from "./domain_types.js";
import type { NoIntent } from "./order_intent_creation.js";
import type { ShadowLedgerState } from "./shadow_ledger.js";

export type SafetyGatesV1 = Readonly<{
  haltAll: boolean;
  blockBuy: boolean;
  forceSell: boolean;
}>;

export type SafetyReason =
  | "HALT_ALL_ACTIVE"
  | "BUY_BLOCKED"
  | "FORCE_SELL_ACTIVE"
  | "POSITION_ALREADY_OPEN";

export type SafetyEvaluationResult =
  | Readonly<{ type: "ALLOW" }>
  | Readonly<{ type: "BLOCK_BUY"; reason: SafetyReason }>
  | Readonly<{ type: "FORCE_SELL"; reason: SafetyReason }>
  | Readonly<{ type: "HALT"; reason: SafetyReason }>;

export type SafetyEvaluationInput = Readonly<{
  proposed: OrderIntent | NoIntent;
  ledger: ShadowLedgerState;
  plane: ExecutionPlane;
  gates: SafetyGatesV1;
  logicalTime: LogicalTime;
}>;

function hasOpenPosition(ledger: ShadowLedgerState): boolean {
  return Object.values(ledger.positions).some((p) => p.isOpen);
}

function isBuy(proposed: OrderIntent | NoIntent): proposed is OrderIntent {
  return (proposed as any).side === "BUY";
}

function isSell(proposed: OrderIntent | NoIntent): proposed is OrderIntent {
  return (proposed as any).side === "SELL";
}

/**
 * Deterministic Safety evaluation (pure).
 *
 * Rules are evaluated in order (v1-final).
 */
export function evaluateSafetyV1(input: SafetyEvaluationInput): SafetyEvaluationResult {
  const { proposed, ledger, plane, gates } = input;

  // Structural boundary: plane must match ledger plane (strict separation).
  if (ledger.plane !== plane) {
    throw new Error("SafetyEvaluationInput.plane must match ShadowLedgerState.plane");
  }

  const open = hasOpenPosition(ledger);

  // Rule 1 — Global Halt
  if (gates.haltAll === true) {
    if (isSell(proposed)) return Object.freeze({ type: "ALLOW" });
    return Object.freeze({ type: "HALT", reason: "HALT_ALL_ACTIVE" });
  }

  // Rule 2 — Force Sell
  if (gates.forceSell === true && open) {
    return Object.freeze({ type: "FORCE_SELL", reason: "FORCE_SELL_ACTIVE" });
  }

  // Rule 3 — Block Buy
  if (gates.blockBuy === true && isBuy(proposed)) {
    return Object.freeze({ type: "BLOCK_BUY", reason: "BUY_BLOCKED" });
  }

  // Rule 4 — Single Position Invariant
  if (isBuy(proposed) && open) {
    return Object.freeze({ type: "BLOCK_BUY", reason: "POSITION_ALREADY_OPEN" });
  }

  // Rule 5 — Default
  return Object.freeze({ type: "ALLOW" });
}

