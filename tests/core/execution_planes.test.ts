import { describe, expect, it } from "vitest";

import {
  createDecimalString,
  createLogicalTime,
  deriveExecutionId,
  LIVE_EXECUTION_STUB,
  PAPER_EXECUTION,
  type ExecutionOutcome,
  type OrderIntent
} from "../../src/core/index.js";

describe("Step 6 — Execution Planes (Paper / Live)", () => {
  it("derives a deterministic executionId from (orderIntent.id, plane, logicalTime)", () => {
    const t = createLogicalTime(7);
    const id1 = deriveExecutionId("oi-1", "PAPER", t);
    const id2 = deriveExecutionId("oi-1", "PAPER", t);
    expect(id1).toBe(id2);

    expect(deriveExecutionId("oi-2", "PAPER", t)).not.toBe(id1);
    expect(deriveExecutionId("oi-1", "LIVE", t)).not.toBe(id1);
    expect(deriveExecutionId("oi-1", "PAPER", createLogicalTime(8))).not.toBe(id1);
  });

  it("executes paper intents deterministically as full fills (FILLED) with filledQuantity=intent.value", () => {
    const intent: OrderIntent = {
      id: "oi-paper-1",
      side: "BUY",
      marketId: "BINANCE_SPOT:BTC/USDT",
      intent: { type: "ALLOCATION", value: createDecimalString("0.5") }
    };
    const logicalTime = createLogicalTime(42);

    const out1 = PAPER_EXECUTION.execute(intent, logicalTime);
    const out2 = PAPER_EXECUTION.execute(intent, logicalTime);

    expect(out1).toEqual(out2);
    expect(out1.plane).toBe("PAPER");
    expect(out1.status).toBe("FILLED");
    expect(out1.side).toBe(intent.side);
    expect(out1.marketId).toBe(intent.marketId);
    expect(out1.filledQuantity).toBe(intent.intent.value);
    expect(out1.orderIntentId).toBe(intent.id);
    expect(out1.logicalTime).toBe(logicalTime);
    expect(out1.reason).toBeUndefined();

    expect(Object.isFrozen(out1)).toBe(true);
  });

  it("executes live stub intents without I/O as deterministic outcomes (v1: FILLED permitted)", () => {
    const intent: OrderIntent = {
      id: "oi-live-1",
      side: "SELL",
      marketId: "BINANCE_SPOT:ETH/USDT",
      intent: { type: "ALLOCATION", value: createDecimalString("1") }
    };
    const logicalTime = createLogicalTime(1);

    const out: ExecutionOutcome = LIVE_EXECUTION_STUB.execute(intent, logicalTime);
    expect(out.plane).toBe("LIVE");
    expect(out.status).toBe("FILLED");
    expect(out.side).toBe(intent.side);
    expect(out.marketId).toBe(intent.marketId);
    expect(out.filledQuantity).toBe(intent.intent.value);
    expect(out.reason).toBeUndefined();
  });
});

