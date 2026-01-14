import { describe, expect, it } from "vitest";

import {
  createDecimalString,
  createLogicalTime,
  createUuid,
  decideAttentionWorthiness,
  selectParameterPoolV1,
  type Position
} from "../../src/core/index.js";
import {
  initializeStrategyLifecycle,
  transitionStrategyLifecycle,
  type StrategyLifecycle
} from "../../src/core/strategy_lifecycle.js";
import {
  createOrderIntentV1,
  deriveOrderIntentId,
  type SafetyGates
} from "../../src/core/order_intent_creation.js";

function samplePosition(marketId: string, allocationValue: string): Position {
  return {
    id: "pos-1",
    marketId,
    size: createDecimalString(allocationValue),
    entryRef: { executionId: "exec-1" }
  };
}

function attentionPositive() {
  return decideAttentionWorthiness({
    attentionMeaningfullyHigher: true,
    stabilityMeetsMinimum: true,
    confidenceSufficient: true,
    differencePersistsOverTime: true,
    switchingCostsJustified: true
  });
}

function attentionNegative() {
  return decideAttentionWorthiness({
    attentionMeaningfullyHigher: true,
    stabilityMeetsMinimum: false,
    confidenceSufficient: true,
    differencePersistsOverTime: true,
    switchingCostsJustified: true
  });
}

const DEFAULT_GATES: SafetyGates = Object.freeze({ blockBuy: false, forceSell: false });

describe("Step 5 — OrderIntent Creation (v1-final)", () => {
  it("creates a BUY OrderIntent when lifecycle+attention+targetMarket+gates permit, and is deterministic", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000001");
    const logicalTime = createLogicalTime(42);

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 3,
      cooldownDuration: 5
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });

    const parameterPool = selectParameterPoolV1({ requestedPoolId: "balanced@v1" })
      .parameterPool;
    const targetMarketId = "BINANCE_SPOT:BTC/USDT";

    const out1 = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      targetMarketId,
      safetyGates: DEFAULT_GATES,
      logicalTime
    });
    const out2 = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      targetMarketId,
      safetyGates: DEFAULT_GATES,
      logicalTime
    });

    expect(out1).toEqual(out2);
    if (out1.type === "NO_INTENT") throw new Error("expected BUY OrderIntent");

    expect(out1.side).toBe("BUY");
    expect(out1.marketId).toBe(targetMarketId);
    expect(out1.intent.type).toBe("ALLOCATION");
    expect(out1.intent.value).toBe(parameterPool.allocation);
    expect(out1.id).toBe(deriveOrderIntentId(strategyInstanceId, targetMarketId, "BUY", logicalTime));
  });

  it("returns NoIntent(MISSING_TARGET_MARKET) when BUY is otherwise permitted but targetMarketId is missing", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000002");
    const logicalTime = createLogicalTime(1);

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 0,
      cooldownDuration: 0
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });

    const parameterPool = selectParameterPoolV1({}).parameterPool;

    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      safetyGates: DEFAULT_GATES,
      logicalTime
    });
    expect(out).toEqual({ type: "NO_INTENT", reason: "MISSING_TARGET_MARKET" });
  });

  it("returns NoIntent(SAFETY_BLOCKED) when blockBuy gate is active", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000003");
    const logicalTime = createLogicalTime(1);

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 0,
      cooldownDuration: 0
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });

    const parameterPool = selectParameterPoolV1({}).parameterPool;

    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      targetMarketId: "BINANCE_SPOT:ETH/USDT",
      safetyGates: { blockBuy: true, forceSell: false },
      logicalTime
    });
    expect(out).toEqual({ type: "NO_INTENT", reason: "SAFETY_BLOCKED" });
  });

  it("creates a SELL OrderIntent when holding and rotation is permitted and hold-time has elapsed", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000004");
    const enteredAt = createLogicalTime(10);
    const now = createLogicalTime(13); // enteredAt + minimumHoldTime (3)

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 3,
      cooldownDuration: 5
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy-1"
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "BUY_EXECUTION_SUCCEEDED",
      position: samplePosition("BINANCE_SPOT:BTC/USDT", "2.5"),
      logicalTime: enteredAt
    });

    const parameterPool = selectParameterPoolV1({}).parameterPool;

    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      targetMarketId: "BINANCE_SPOT:ETH/USDT",
      safetyGates: DEFAULT_GATES,
      logicalTime: now
    });

    if (out.type === "NO_INTENT") throw new Error("expected SELL OrderIntent");
    expect(out.side).toBe("SELL");
    expect(out.marketId).toBe("BINANCE_SPOT:BTC/USDT");
    expect(out.intent.value).toBe(createDecimalString("2.5"));
    expect(out.id).toBe(
      deriveOrderIntentId(strategyInstanceId, "BINANCE_SPOT:BTC/USDT", "SELL", now)
    );
  });

  it("returns NoIntent(HOLD_TIME_ACTIVE) when holding and rotation is recommended but hold-time is still active", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000005");
    const enteredAt = createLogicalTime(10);
    const now = createLogicalTime(12); // hold-time (3) not elapsed

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 3,
      cooldownDuration: 5
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy-1"
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "BUY_EXECUTION_SUCCEEDED",
      position: samplePosition("BINANCE_SPOT:BTC/USDT", "1.0"),
      logicalTime: enteredAt
    });

    const parameterPool = selectParameterPoolV1({}).parameterPool;

    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      safetyGates: DEFAULT_GATES,
      logicalTime: now
    });

    expect(out).toEqual({ type: "NO_INTENT", reason: "HOLD_TIME_ACTIVE" });
  });

  it("creates a SELL OrderIntent when forceSell gate is active (bypasses hold-time and attention)", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000006");
    const enteredAt = createLogicalTime(10);
    const now = createLogicalTime(12);

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 999,
      cooldownDuration: 5
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy-1"
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "BUY_EXECUTION_SUCCEEDED",
      position: samplePosition("BINANCE_SPOT:BTC/USDT", "3.0"),
      logicalTime: enteredAt
    });

    const parameterPool = selectParameterPoolV1({}).parameterPool;

    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionNegative(), // ignored due to forceSell
      parameterPool,
      safetyGates: { blockBuy: false, forceSell: true },
      logicalTime: now
    });

    if (out.type === "NO_INTENT") throw new Error("expected SELL OrderIntent");
    expect(out.side).toBe("SELL");
    expect(out.marketId).toBe("BINANCE_SPOT:BTC/USDT");
  });

  it("returns NoIntent(COOLDOWN_ACTIVE) when lifecycle is in cooldown and cooldown has not elapsed", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000007");

    let lifecycle: StrategyLifecycle = initializeStrategyLifecycle({
      minimumHoldTime: 0,
      cooldownDuration: 5
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, { type: "META_TRIGGER_EVALUATION" });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "EVALUATION_BUY_INTENT_CREATED",
      buyOrderIntentId: "oi-buy-1"
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "BUY_EXECUTION_SUCCEEDED",
      position: samplePosition("BINANCE_SPOT:BTC/USDT", "1.0"),
      logicalTime: createLogicalTime(10)
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "REQUEST_SAFETY_EXIT",
      sellOrderIntentId: "oi-sell-safety-1"
    });
    lifecycle = transitionStrategyLifecycle(lifecycle, {
      type: "SELL_EXECUTION_SUCCEEDED",
      logicalTime: createLogicalTime(20)
    });
    // cooldownUntil = 25

    const parameterPool = selectParameterPoolV1({}).parameterPool;
    const out = createOrderIntentV1({
      strategyInstanceId,
      lifecycle,
      attention: attentionPositive(),
      parameterPool,
      targetMarketId: "BINANCE_SPOT:ETH/USDT",
      safetyGates: DEFAULT_GATES,
      logicalTime: createLogicalTime(24)
    });

    expect(out).toEqual({ type: "NO_INTENT", reason: "COOLDOWN_ACTIVE" });
  });

  it("derives different OrderIntentIds when logicalTime differs (determinism boundary)", () => {
    const strategyInstanceId = createUuid("00000000-0000-0000-0000-000000000008");
    const marketId = "BINANCE_SPOT:BTC/USDT";
    const id1 = deriveOrderIntentId(strategyInstanceId, marketId, "BUY", createLogicalTime(1));
    const id2 = deriveOrderIntentId(strategyInstanceId, marketId, "BUY", createLogicalTime(2));
    expect(id1).not.toBe(id2);
  });
});

