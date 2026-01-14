import { describe, expect, it } from "vitest";

import {
  createDecimalString,
  createLogicalTime,
  createUuid,
  type ExecutionOutcome
} from "../../src/core/index.js";
import {
  applyExecutionOutcome,
  applyExecutionOutcomes,
  initializeShadowLedgerState
} from "../../src/core/shadow_ledger.js";

describe("Step 7 — Shadow Ledger (v1-final)", () => {
  it("applies FILLED BUY to open position with quantity=filledQuantity", () => {
    const s0 = initializeShadowLedgerState("PAPER");
    const outcome: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000101"),
      orderIntentId: "oi-1",
      plane: "PAPER",
      status: "FILLED",
      side: "BUY",
      marketId: "BINANCE_SPOT:BTC/USDT",
      filledQuantity: createDecimalString("1.5"),
      logicalTime: createLogicalTime(1)
    };

    const { nextState, deviationClass } = applyExecutionOutcome(s0, outcome);
    expect(deviationClass).toBe("NONE");
    expect(nextState.plane).toBe("PAPER");
    expect(nextState.positions["BINANCE_SPOT:BTC/USDT"]).toEqual({
      marketId: "BINANCE_SPOT:BTC/USDT",
      quantity: createDecimalString("1.5"),
      isOpen: true,
      lastExecutionId: outcome.executionId
    });
  });

  it("applies FILLED SELL to close position and set quantity='0'", () => {
    const s0 = initializeShadowLedgerState("PAPER");
    const buy: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000201"),
      orderIntentId: "oi-1",
      plane: "PAPER",
      status: "FILLED",
      side: "BUY",
      marketId: "BINANCE_SPOT:BTC/USDT",
      filledQuantity: createDecimalString("2"),
      logicalTime: createLogicalTime(1)
    };
    const sell: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000202"),
      orderIntentId: "oi-2",
      plane: "PAPER",
      status: "FILLED",
      side: "SELL",
      marketId: "BINANCE_SPOT:BTC/USDT",
      filledQuantity: createDecimalString("2"),
      logicalTime: createLogicalTime(2)
    };

    const s1 = applyExecutionOutcome(s0, buy).nextState;
    const s2 = applyExecutionOutcome(s1, sell).nextState;

    expect(s2.positions["BINANCE_SPOT:BTC/USDT"]).toEqual({
      marketId: "BINANCE_SPOT:BTC/USDT",
      quantity: createDecimalString("0"),
      isOpen: false,
      lastExecutionId: sell.executionId
    });
  });

  it("maps FAILED to deviation EXECUTION_FAILED and does not change state", () => {
    const s0 = initializeShadowLedgerState("LIVE");
    const failed: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000301"),
      orderIntentId: "oi-x",
      plane: "LIVE",
      status: "FAILED",
      side: "BUY",
      marketId: "BINANCE_SPOT:ETH/USDT",
      filledQuantity: createDecimalString("1"),
      logicalTime: createLogicalTime(1),
      reason: "EXECUTION_REJECTED"
    };

    const { nextState, deviationClass } = applyExecutionOutcome(s0, failed);
    expect(deviationClass).toBe("EXECUTION_FAILED");
    expect(nextState).toBe(s0);
  });

  it("treats PARTIALLY_FILLED as v1 no-op and keeps deviation NONE", () => {
    const s0 = initializeShadowLedgerState("LIVE");
    const partial: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000401"),
      orderIntentId: "oi-x",
      plane: "LIVE",
      status: "PARTIALLY_FILLED",
      side: "BUY",
      marketId: "BINANCE_SPOT:ETH/USDT",
      filledQuantity: createDecimalString("0.1"),
      logicalTime: createLogicalTime(1)
    };

    const { nextState, deviationClass } = applyExecutionOutcome(s0, partial);
    expect(deviationClass).toBe("NONE");
    expect(nextState).toBe(s0);
  });

  it("is replay-stable for identical ordered outcome sequences", () => {
    const s0 = initializeShadowLedgerState("PAPER");
    const outcomes: ReadonlyArray<ExecutionOutcome> = [
      {
        executionId: createUuid("00000000-0000-0000-0000-000000000501"),
        orderIntentId: "oi-1",
        plane: "PAPER",
        status: "FILLED",
        side: "BUY",
        marketId: "BINANCE_SPOT:BTC/USDT",
        filledQuantity: createDecimalString("1"),
        logicalTime: createLogicalTime(1)
      },
      {
        executionId: createUuid("00000000-0000-0000-0000-000000000502"),
        orderIntentId: "oi-2",
        plane: "PAPER",
        status: "FILLED",
        side: "SELL",
        marketId: "BINANCE_SPOT:BTC/USDT",
        filledQuantity: createDecimalString("1"),
        logicalTime: createLogicalTime(2)
      }
    ];

    const a = applyExecutionOutcomes(s0, outcomes);
    const b = applyExecutionOutcomes(s0, outcomes);
    expect(a).toEqual(b);
  });

  it("enforces plane separation by throwing on plane mismatch", () => {
    const s0 = initializeShadowLedgerState("PAPER");
    const out: ExecutionOutcome = {
      executionId: createUuid("00000000-0000-0000-0000-000000000601"),
      orderIntentId: "oi-1",
      plane: "LIVE",
      status: "FILLED",
      side: "BUY",
      marketId: "BINANCE_SPOT:BTC/USDT",
      filledQuantity: createDecimalString("1"),
      logicalTime: createLogicalTime(1)
    };
    expect(() => applyExecutionOutcome(s0, out)).toThrow();
  });
});

