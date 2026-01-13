import { describe, expect, it } from "vitest";

import {
  createAssetId,
  createDecisionClass,
  createDecimalString,
  createExchangeId,
  createLogicalTime,
  createStrategyId,
  createUuid,
  type Decision,
  type Market,
  type OrderIntent,
  type Position,
  type Strategy,
  type StrategyInstance
} from "../../src/core/index.js";

describe("Step 1 — Core Domain Types", () => {
  it("constructs deterministic value objects and serializes stably", () => {
    const market: Market = {
      marketId: "BINANCE_SPOT:BTC/USDT",
      baseAssetId: createAssetId("BTC"),
      quoteAssetId: createAssetId("USDT"),
      exchangeId: createExchangeId("BINANCE_SPOT")
    };

    const strategy: Strategy = {
      strategyId: createStrategyId("rotation@v1")
    };

    const instance: StrategyInstance = {
      instanceId: createUuid("00000000-0000-0000-0000-000000000001"),
      strategyId: strategy.strategyId,
      state: { opaque: true, counter: 1 }
    };

    const decision: Decision = {
      decisionClass: createDecisionClass("attention.rotate.primary@v1"),
      reasonCodes: ["ATTENTION_SUPERIOR"],
      logicalTime: createLogicalTime(42)
    };

    const intent: OrderIntent = {
      id: "oi-1",
      side: "BUY",
      marketId: market.marketId,
      intent: { type: "ALLOCATION", value: createDecimalString("0.5") }
    };

    const position: Position = {
      id: "pos-1",
      marketId: market.marketId,
      size: createDecimalString("1.25"),
      entryRef: { executionId: "exec-1" }
    };

    // Equality: structural equality only (no behavior/methods in Step 1).
    expect(JSON.parse(JSON.stringify(market))).toEqual(market);
    expect(JSON.parse(JSON.stringify(strategy))).toEqual(strategy);
    expect(JSON.parse(JSON.stringify(instance))).toEqual(instance);
    expect(JSON.parse(JSON.stringify(decision))).toEqual(decision);
    expect(JSON.parse(JSON.stringify(intent))).toEqual(intent);
    expect(JSON.parse(JSON.stringify(position))).toEqual(position);

    // Serialization stability: stable property insertion order in object literals.
    expect(JSON.stringify(intent)).toBe(
      '{"id":"oi-1","side":"BUY","marketId":"BINANCE_SPOT:BTC/USDT","intent":{"type":"ALLOCATION","value":"0.5"}}'
    );
  });

  it("enforces documented construction invariants (where specified)", () => {
    expect(() => createAssetId("btc")).toThrow();
    expect(() => createExchangeId("KRAKEN_SPOT")).toThrow();
    expect(() => createDecisionClass("bad-format")).toThrow();
    expect(() => createLogicalTime(-1)).toThrow();
    expect(() => createDecimalString("")).toThrow();
    expect(() => createDecimalString("1e5")).toThrow();
    expect(() => createStrategyId("rotation-v1")).toThrow();
    expect(() => createUuid("not-a-uuid")).toThrow();
  });
});

