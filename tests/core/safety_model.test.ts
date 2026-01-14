import { describe, expect, it } from "vitest";

import {
  createDecimalString,
  createLogicalTime,
  createUuid,
  type OrderIntent
} from "../../src/core/index.js";
import type { NoIntent } from "../../src/core/order_intent_creation.js";
import type { ExecutionOutcome } from "../../src/core/index.js";
import {
  evaluateSafetyV1,
  type SafetyGatesV1
} from "../../src/core/safety_model.js";
import {
  applyExecutionOutcome,
  initializeShadowLedgerState
} from "../../src/core/shadow_ledger.js";

const BUY_INTENT: OrderIntent = {
  id: "oi-buy-1",
  side: "BUY",
  marketId: "BINANCE_SPOT:BTC/USDT",
  intent: { type: "ALLOCATION", value: createDecimalString("1") }
};

const SELL_INTENT: OrderIntent = {
  id: "oi-sell-1",
  side: "SELL",
  marketId: "BINANCE_SPOT:BTC/USDT",
  intent: { type: "ALLOCATION", value: createDecimalString("1") }
};

const NO_INTENT: NoIntent = { type: "NO_INTENT", reason: "PRECONDITIONS_NOT_MET" };

function openPositionLedger(plane: "PAPER" | "LIVE") {
  const s0 = initializeShadowLedgerState(plane);
  const out: ExecutionOutcome = {
    executionId: createUuid("00000000-0000-0000-0000-000000009001"),
    orderIntentId: "oi-x",
    plane,
    status: "FILLED",
    side: "BUY",
    marketId: "BINANCE_SPOT:BTC/USDT",
    filledQuantity: createDecimalString("1"),
    logicalTime: createLogicalTime(1)
  };
  return applyExecutionOutcome(s0, out).nextState;
}

describe("Step 8 — Safety Model (Execution-side) (v1-final)", () => {
  it("Rule 1 (haltAll): BUY -> HALT, SELL -> ALLOW, NoIntent -> HALT", () => {
    const ledger = initializeShadowLedgerState("PAPER");
    const gates: SafetyGatesV1 = { haltAll: true, blockBuy: false, forceSell: false };

    expect(
      evaluateSafetyV1({
        proposed: BUY_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toEqual({ type: "HALT", reason: "HALT_ALL_ACTIVE" });

    expect(
      evaluateSafetyV1({
        proposed: SELL_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toEqual({ type: "ALLOW" });

    expect(
      evaluateSafetyV1({
        proposed: NO_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toEqual({ type: "HALT", reason: "HALT_ALL_ACTIVE" });
  });

  it("Rule 2 (forceSell): if open position exists -> FORCE_SELL (regardless of proposed), but only when not halted", () => {
    const ledger = openPositionLedger("LIVE");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: true };

    expect(
      evaluateSafetyV1({
        proposed: NO_INTENT,
        ledger,
        plane: "LIVE",
        gates,
        logicalTime: createLogicalTime(2)
      })
    ).toEqual({ type: "FORCE_SELL", reason: "FORCE_SELL_ACTIVE" });
  });

  it("Rule 2 (forceSell): does NOT trigger when no position is open", () => {
    const ledger = initializeShadowLedgerState("LIVE");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: true };

    expect(
      evaluateSafetyV1({
        proposed: NO_INTENT,
        ledger,
        plane: "LIVE",
        gates,
        logicalTime: createLogicalTime(2)
      })
    ).toEqual({ type: "ALLOW" });
  });

  it("Rule 3 (blockBuy): blocks BUY intents with BUY_BLOCKED", () => {
    const ledger = initializeShadowLedgerState("PAPER");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: true, forceSell: false };

    expect(
      evaluateSafetyV1({
        proposed: BUY_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toEqual({ type: "BLOCK_BUY", reason: "BUY_BLOCKED" });
  });

  it("Rule 4 (single position invariant): blocks BUY when an open position exists and buy is proposed", () => {
    const ledger = openPositionLedger("PAPER");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: false };

    expect(
      evaluateSafetyV1({
        proposed: BUY_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(2)
      })
    ).toEqual({ type: "BLOCK_BUY", reason: "POSITION_ALREADY_OPEN" });
  });

  it("Default rule: ALLOW when no other rule applies", () => {
    const ledger = initializeShadowLedgerState("PAPER");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: false };

    expect(
      evaluateSafetyV1({
        proposed: NO_INTENT,
        ledger,
        plane: "PAPER",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toEqual({ type: "ALLOW" });
  });

  it("is deterministic for identical inputs", () => {
    const ledger = openPositionLedger("LIVE");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: true };
    const input = {
      proposed: NO_INTENT,
      ledger,
      plane: "LIVE" as const,
      gates,
      logicalTime: createLogicalTime(3)
    };
    expect(evaluateSafetyV1(input)).toEqual(evaluateSafetyV1(input));
  });

  it("throws on plane mismatch (structural boundary)", () => {
    const ledger = initializeShadowLedgerState("PAPER");
    const gates: SafetyGatesV1 = { haltAll: false, blockBuy: false, forceSell: false };
    expect(() =>
      evaluateSafetyV1({
        proposed: NO_INTENT,
        ledger,
        plane: "LIVE",
        gates,
        logicalTime: createLogicalTime(1)
      })
    ).toThrow();
  });
});

