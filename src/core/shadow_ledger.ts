/**
 * Step 7 — Shadow Ledger (v1-final)
 *
 * Sole source of truth:
 * - docs/execution/SHADOW_LEDGER.md (v1-final)
 *
 * Constraints:
 * - Deterministic derived state from ExecutionOutcomes only
 * - No pricing, balances, lifecycle, or strategy logic
 * - Strict separation per ExecutionPlane
 */

import type { MarketId } from "./domain_types.js";
import type { DecimalString, UUID } from "./value_objects.js";
import { createDecimalString } from "./value_objects.js";
import type { ExecutionOutcome, ExecutionPlane } from "./execution_planes.js";

export type ShadowLedgerPosition = Readonly<{
  marketId: MarketId;
  quantity: DecimalString;
  isOpen: boolean;
  lastExecutionId: UUID;
}>;

export type ShadowLedgerState = Readonly<{
  plane: ExecutionPlane;
  positions: Readonly<Record<MarketId, ShadowLedgerPosition>>;
}>;

export type DeviationClass = "NONE" | "EXECUTION_FAILED";

export type ShadowLedgerUpdate = Readonly<{
  nextState: ShadowLedgerState;
  deviationClass: DeviationClass;
}>;

export function initializeShadowLedgerState(plane: ExecutionPlane): ShadowLedgerState {
  return Object.freeze({
    plane,
    positions: Object.freeze({})
  });
}

/**
 * Pure reducer: nextState = applyExecutionOutcome(previousState, executionOutcome)
 *
 * Rules (v1-final):
 * - Order of outcomes is significant
 * - Identical ordered sequences produce identical states
 * - ExecutionOutcomes must not cross-contaminate planes
 */
export function applyExecutionOutcome(
  previousState: ShadowLedgerState,
  outcome: ExecutionOutcome
): ShadowLedgerUpdate {
  // Structural / boundary validation (allowed to throw).
  if (previousState.plane !== outcome.plane) {
    throw new Error("ExecutionOutcome plane must match ShadowLedgerState plane");
  }

  if (outcome.status === "FAILED") {
    return Object.freeze({ nextState: previousState, deviationClass: "EXECUTION_FAILED" });
  }

  if (outcome.status === "PARTIALLY_FILLED") {
    // Not used in v1; MUST NOT change state.
    return Object.freeze({ nextState: previousState, deviationClass: "NONE" });
  }

  // FILLED
  const positions = previousState.positions;
  const marketId = outcome.marketId;

  if (outcome.side === "BUY") {
    const nextPos: ShadowLedgerPosition = Object.freeze({
      marketId,
      quantity: outcome.filledQuantity,
      isOpen: true,
      lastExecutionId: outcome.executionId
    });
    const nextPositions = Object.freeze({ ...positions, [marketId]: nextPos });
    return Object.freeze({
      nextState: Object.freeze({ plane: previousState.plane, positions: nextPositions }),
      deviationClass: "NONE"
    });
  }

  // FILLED SELL
  const nextPos: ShadowLedgerPosition = Object.freeze({
    marketId,
    quantity: createDecimalString("0"),
    isOpen: false,
    lastExecutionId: outcome.executionId
  });
  const nextPositions = Object.freeze({ ...positions, [marketId]: nextPos });
  return Object.freeze({
    nextState: Object.freeze({ plane: previousState.plane, positions: nextPositions }),
    deviationClass: "NONE"
  });
}

export function applyExecutionOutcomes(
  initialState: ShadowLedgerState,
  outcomes: ReadonlyArray<ExecutionOutcome>
): ShadowLedgerState {
  let state = initialState;
  for (const o of outcomes) {
    state = applyExecutionOutcome(state, o).nextState;
  }
  return state;
}

