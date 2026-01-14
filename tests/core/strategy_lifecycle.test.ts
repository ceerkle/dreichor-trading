import { describe, expect, it } from "vitest";

import {
  createDecimalString,
  createLogicalTime,
  type Position
} from "../../src/core/index.js";
import {
  initializeStrategyLifecycle,
  InvalidLifecycleTransitionError,
  transitionStrategyLifecycle,
  type StrategyLifecycle
} from "../../src/core/strategy_lifecycle.js";

function samplePosition(marketId: string): Position {
  return {
    id: "pos-1",
    marketId,
    size: createDecimalString("1.25"),
    entryRef: { executionId: "exec-1" }
  };
}

describe("Step 2 — Strategy Lifecycle State Machine", () => {
  it("walks the documented lifecycle and enforces hold-time + cooldown + safety override", () => {
    let lc: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 3,
      cooldownDuration: 5
    });

    expect(lc.state.tag).toBe("IDLE");

    lc = transitionStrategyLifecycle(lc, { type: "META_TRIGGER_EVALUATION" });
    expect(lc.state.tag).toBe("EVALUATION");

    lc = transitionStrategyLifecycle(lc, { type: "EVALUATION_NO_ACTION" });
    expect(lc.state.tag).toBe("IDLE");

    lc = transitionStrategyLifecycle(lc, { type: "META_TRIGGER_EVALUATION" });
    lc = transitionStrategyLifecycle(lc, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy-1"
    });
    expect(lc.state.tag).toBe("ENTRY");

    expect(() =>
      transitionStrategyLifecycle(lc, { type: "META_TRIGGER_EVALUATION" })
    ).toThrow(InvalidLifecycleTransitionError);

    lc = transitionStrategyLifecycle(lc, {
      type: "BUY_EXECUTION_SUCCEEDED",
      position: samplePosition("BINANCE_SPOT:BTC/USDT"),
      logicalTime: createLogicalTime(10)
    });
    expect(lc.state.tag).toBe("HOLDING");

    // Rotation before hold-time expiry is a No-Op (remain Holding).
    lc = transitionStrategyLifecycle(lc, {
      type: "REQUEST_ROTATION_EXIT",
      sellOrderIntentId: "oi-sell-rot-1",
      logicalTime: createLogicalTime(12)
    });
    expect(lc.state.tag).toBe("HOLDING");

    // Rotation at hold-time boundary is allowed (expires at enteredAt + minimumHoldTime).
    lc = transitionStrategyLifecycle(lc, {
      type: "REQUEST_ROTATION_EXIT",
      sellOrderIntentId: "oi-sell-rot-2",
      logicalTime: createLogicalTime(13)
    });
    expect(lc.state.tag).toBe("EXIT");
    if (lc.state.tag !== "EXIT") throw new Error("expected EXIT");
    expect(lc.state.exitReason).toBe("ROTATION_SELL");

    // Safety during Exit overwrites exit reason (clarification).
    lc = transitionStrategyLifecycle(lc, {
      type: "REQUEST_SAFETY_EXIT",
      sellOrderIntentId: "oi-sell-safety-ignored"
    });
    expect(lc.state.tag).toBe("EXIT");
    if (lc.state.tag !== "EXIT") throw new Error("expected EXIT");
    expect(lc.state.exitReason).toBe("SAFETY_SELL");

    // Failed sell returns to Holding with position still open.
    lc = transitionStrategyLifecycle(lc, { type: "SELL_EXECUTION_FAILED" });
    expect(lc.state.tag).toBe("HOLDING");

    // Safety ignores hold time and initiates safety exit.
    lc = transitionStrategyLifecycle(lc, {
      type: "REQUEST_SAFETY_EXIT",
      sellOrderIntentId: "oi-sell-safety-1"
    });
    expect(lc.state.tag).toBe("EXIT");
    if (lc.state.tag !== "EXIT") throw new Error("expected EXIT");
    expect(lc.state.exitReason).toBe("SAFETY_SELL");

    // Successful safety sell leads to Cooldown.
    lc = transitionStrategyLifecycle(lc, {
      type: "SELL_EXECUTION_SUCCEEDED",
      logicalTime: createLogicalTime(20)
    });
    expect(lc.state.tag).toBe("COOLDOWN");
    if (lc.state.tag !== "COOLDOWN") throw new Error("expected COOLDOWN");
    expect(lc.state.cooldownUntil).toBe(createLogicalTime(25));

    // This represents logical/meta time, not wall-clock time.
    lc = transitionStrategyLifecycle(lc, {
      type: "LOGICAL_TIME_ADVANCED",
      logicalTime: createLogicalTime(24)
    });
    expect(lc.state.tag).toBe("COOLDOWN");

    // This represents logical/meta time, not wall-clock time.
    lc = transitionStrategyLifecycle(lc, {
      type: "LOGICAL_TIME_ADVANCED",
      logicalTime: createLogicalTime(25)
    });
    expect(lc.state.tag).toBe("REENTRY_ELIGIBILITY");

    // Re-entry eligibility is a real state; transition to Idle only via meta trigger.
    lc = transitionStrategyLifecycle(lc, { type: "META_TRIGGER_IDLE" });
    expect(lc.state.tag).toBe("IDLE");
  });

  it("rejects invalid transitions deterministically", () => {
    let lc: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 0,
      cooldownDuration: 1
    });

    expect(() =>
      transitionStrategyLifecycle(lc, {
        type: "REQUEST_ROTATION_EXIT",
        sellOrderIntentId: "oi-x",
        logicalTime: createLogicalTime(1)
      })
    ).toThrow(InvalidLifecycleTransitionError);

    lc = transitionStrategyLifecycle(lc, { type: "META_TRIGGER_EVALUATION" });
    lc = transitionStrategyLifecycle(lc, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy"
    });

    expect(() =>
      transitionStrategyLifecycle(lc, {
        type: "SELL_EXECUTION_SUCCEEDED",
        logicalTime: createLogicalTime(1)
      })
    ).toThrow(InvalidLifecycleTransitionError);
  });
});

