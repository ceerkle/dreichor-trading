// Core value objects (RAGE): deterministic, immutable, no I/O.
// Implemented strictly from:
// - docs/adr/ADR-011.md
// - docs/adr/ADR-012.md

export type LogicalTime = number & { readonly __brand: "LogicalTime" };

/**
 * LogicalTime
 * - Immutable value object
 * - Backed by a monotonically increasing unsigned integer
 * - No wall-clock semantics
 */
export function createLogicalTime(value: number): LogicalTime {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("LogicalTime must be a non-negative safe integer");
  }
  return value as LogicalTime;
}

export type DecisionClass = string & { readonly __brand: "DecisionClass" };

/**
 * DecisionClass
 * - String-based identifier
 * - Format: `<domain>.<action>.<variant>@v<version>`
 */
export function createDecisionClass(value: string): DecisionClass {
  if (typeof value !== "string") {
    throw new Error("DecisionClass must be a string");
  }
  // Minimal validation: 3 dot-separated segments + @v<digits> suffix.
  // Character set is intentionally not over-specified in documentation.
  const re = /^.+\..+\..+@v\d+$/;
  if (!re.test(value)) {
    throw new Error(
      "DecisionClass must match <domain>.<action>.<variant>@v<version>"
    );
  }
  return value as DecisionClass;
}

export type AssetId = string & { readonly __brand: "AssetId" };

/**
 * AssetId
 * - Uppercase alphanumeric string
 */
export function createAssetId(value: string): AssetId {
  if (typeof value !== "string") {
    throw new Error("AssetId must be a string");
  }
  const re = /^[A-Z0-9]+$/;
  if (!re.test(value)) {
    throw new Error("AssetId must be uppercase alphanumeric");
  }
  return value as AssetId;
}

/**
 * ExchangeId
 * - Finite enum-like value object
 * - Initial value: `BINANCE_SPOT`
 */
export const EXCHANGE_IDS = ["BINANCE_SPOT"] as const;
export type ExchangeId = (typeof EXCHANGE_IDS)[number];

export function createExchangeId(value: string): ExchangeId {
  if (value === "BINANCE_SPOT") return "BINANCE_SPOT";
  throw new Error("Unsupported ExchangeId");
}

/**
 * ReasonCode (v1)
 * - Closed, finite set of string literals (ADR-012)
 */
export const REASON_CODES = [
  "UNKNOWN",
  "ATTENTION_SUPERIOR",
  "ATTENTION_INSUFFICIENT",
  "STABILITY_INSUFFICIENT",
  "HOLD_TIME_ACTIVE",
  "COOLDOWN_ACTIVE",
  "SAFETY_TRIGGERED",
  "PREFLIGHT_BLOCKED"
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/**
 * DecimalString (ADR-012)
 * - Opaque decimal string (no precision semantics)
 * - No validation beyond non-empty decimal format
 */
export type DecimalString = string & { readonly __brand: "DecimalString" };

export function createDecimalString(value: string): DecimalString {
  if (typeof value !== "string") {
    throw new Error("DecimalString must be a string");
  }
  // Minimal "decimal format": optional sign, digits, optional fractional part.
  // Intentionally excludes exponent notation.
  const re = /^[+-]?\d+(\.\d+)?$/;
  if (!re.test(value)) {
    throw new Error("DecimalString must be a non-empty decimal format string");
  }
  return value as DecimalString;
}

export type UUID = string & { readonly __brand: "UUID" };

export function createUuid(value: string): UUID {
  if (typeof value !== "string") {
    throw new Error("UUID must be a string");
  }
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!re.test(value)) {
    throw new Error("UUID must be a valid UUID string");
  }
  return value as UUID;
}

