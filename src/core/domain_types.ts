// Core domain types (Step 1 only): deterministic value objects, no behavior.
// Implemented strictly from:
// - docs/core/DOMAIN_MODEL.md
// - docs/core/GLOSSARY.md
// - docs/adr/ADR-012.md

import type {
  AssetId,
  DecisionClass,
  DecimalString,
  ExchangeId,
  LogicalTime,
  ReasonCode,
  UUID
} from "./value_objects";

/**
 * NOTE: The documentation references these IDs as opaque identifiers in Step 1,
 * but does not define any additional format constraints.
 */
export type MarketId = string;
export type OrderIntentId = string;
export type PositionId = string;
export type StrategyId = string;

/**
 * Market
 * Represents a tradeable spot market.
 *
 * Attributes (conceptual):
 * - Base Asset
 * - Quote Asset
 * - Exchange
 */
export type Market = {
  marketId: MarketId;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  exchangeId: ExchangeId;
};

/**
 * Strategy (Step-1 Representation)
 * Strategy is represented as an identifier only.
 *
 * Format: `<name>@v<version>`
 */
export type Strategy = {
  strategyId: StrategyId;
};

export function createStrategyId(value: string): StrategyId {
  if (typeof value !== "string") {
    throw new Error("StrategyId must be a string");
  }
  // Minimal validation per ADR-012 format, without constraining <name>.
  const re = /^.+@v\d+$/;
  if (!re.test(value)) {
    throw new Error("StrategyId must match <name>@v<version>");
  }
  return value;
}

/**
 * StrategyInstance (Step-1 Representation)
 * Identity plus opaque, JSON-serializable state.
 */
export type StrategyInstance = {
  instanceId: UUID;
  strategyId: StrategyId;
  state: Record<string, unknown>;
};

export function ensureJsonSerializable(value: unknown): void {
  // Throws on cyclic structures and unserializable values.
  JSON.stringify(value);
}

/**
 * Decision
 * A deterministic outcome produced by a strategy instance.
 *
 * Attributes:
 * - Decision Class
 * - Reason Codes
 * - Timestamp (logical)
 */
export type Decision = {
  decisionClass: DecisionClass;
  reasonCodes: ReadonlyArray<ReasonCode>;
  logicalTime: LogicalTime;
};

/**
 * OrderIntent (Step-1 Representation)
 * Fields:
 * - id: OrderIntentId
 * - side: BUY | SELL
 * - marketId: MarketId
 * - intent: { type: "ALLOCATION", value: DecimalString }
 */
export type OrderIntent = {
  id: OrderIntentId;
  side: "BUY" | "SELL";
  marketId: MarketId;
  intent: {
    type: "ALLOCATION";
    value: DecimalString;
  };
};

/**
 * Position (Step-1 Representation)
 * Fields:
 * - id: PositionId
 * - marketId: MarketId
 * - size: DecimalString (opaque)
 * - entryRef: { executionId: string }
 */
export type Position = {
  id: PositionId;
  marketId: MarketId;
  size: DecimalString;
  entryRef: {
    executionId: string;
  };
};

