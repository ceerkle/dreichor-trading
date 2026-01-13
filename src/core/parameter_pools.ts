/**
 * Step 4 — Parameter Pool Selection
 *
 * Source of truth:
 * - docs/strategy/PARAMETER_POOLS.md
 *
 * Constraints (Step 4):
 * - Static pools only (finite, named, versioned)
 * - Deterministic selection (no randomness, no learning, no optimization)
 * - Validation is schema-only (missing key / unknown key / invalid DecimalString)
 * - No semantic interpretation (no range checks, no units, no thresholds)
 */

import { createDecimalString, type DecimalString } from "./value_objects.js";

/**
 * Formal Parameter Schema (Step 4)
 *
 * StrategyParameterSet {
 *   holdTime: DecimalString
 *   cooldownTime: DecimalString
 *   switchingSensitivity: DecimalString
 *   stabilityRequirement: DecimalString
 * }
 */
export type StrategyParameterSet = Readonly<{
  holdTime: DecimalString;
  cooldownTime: DecimalString;
  switchingSensitivity: DecimalString;
  stabilityRequirement: DecimalString;
}>;

export type ParameterSelectionContext = Readonly<{
  requestedPoolId?: string;
}>;

/**
 * Rejection Reasons (v1) — closed set per documentation.
 */
export type ParameterSelectionRejectionReason = "UNKNOWN_POOL" | "INVALID_SCHEMA";

export type ParameterSelectionDecision = Readonly<{
  selectedPoolId: string;
  effectiveParameters: StrategyParameterSet;
  rejectedPoolId?: string;
  rejectionReason?: ParameterSelectionRejectionReason;
}>;

export type ParameterPoolCatalog = Readonly<Record<string, unknown>>;

const STRATEGY_PARAMETER_KEYS = [
  "holdTime",
  "cooldownTime",
  "switchingSensitivity",
  "stabilityRequirement"
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function freezeDecision(decision: ParameterSelectionDecision): ParameterSelectionDecision {
  Object.freeze(decision.effectiveParameters);
  Object.freeze(decision);
  return decision;
}

/**
 * Parses/validates the Step-4 schema. Returns `null` if invalid.
 *
 * Boundary enforcement (Step 4) means:
 * - Missing key → invalid
 * - Unknown key → invalid
 * - Invalid type → invalid
 * - Invalid DecimalString → invalid
 */
function tryParseStrategyParameterSet(value: unknown): StrategyParameterSet | null {
  if (!isPlainObject(value)) return null;

  const keys = Object.keys(value).sort();
  const expected = [...STRATEGY_PARAMETER_KEYS].sort();
  if (keys.length !== expected.length) return null;
  for (let i = 0; i < expected.length; i++) {
    if (keys[i] !== expected[i]) return null;
  }

  const holdTime = value.holdTime;
  const cooldownTime = value.cooldownTime;
  const switchingSensitivity = value.switchingSensitivity;
  const stabilityRequirement = value.stabilityRequirement;

  if (
    typeof holdTime !== "string" ||
    typeof cooldownTime !== "string" ||
    typeof switchingSensitivity !== "string" ||
    typeof stabilityRequirement !== "string"
  ) {
    return null;
  }

  try {
    return Object.freeze({
      holdTime: createDecimalString(holdTime),
      cooldownTime: createDecimalString(cooldownTime),
      switchingSensitivity: createDecimalString(switchingSensitivity),
      stabilityRequirement: createDecimalString(stabilityRequirement)
    });
  } catch {
    return null;
  }
}

/**
 * Deterministically selects a parameter pool based on Step-4 rules.
 *
 * Selection rules:
 * 1. If requestedPoolId is provided and valid → select it.
 * 2. If requestedPoolId is provided but invalid → fallback to default pool.
 * 3. If no requestedPoolId is provided → select default pool.
 */
export function selectParameterPool(
  catalog: ParameterPoolCatalog,
  defaultPoolId: string,
  context: ParameterSelectionContext
): ParameterSelectionDecision {
  const defaultRaw = catalog[defaultPoolId];
  const defaultParsed = tryParseStrategyParameterSet(defaultRaw);
  if (!defaultParsed) {
    throw new Error("Default parameter pool is missing or has an invalid schema");
  }

  const requested = context.requestedPoolId;
  if (requested === undefined) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      effectiveParameters: defaultParsed
    });
  }

  const requestedRaw = catalog[requested];
  if (requestedRaw === undefined) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      effectiveParameters: defaultParsed,
      rejectedPoolId: requested,
      rejectionReason: "UNKNOWN_POOL"
    });
  }

  const requestedParsed = tryParseStrategyParameterSet(requestedRaw);
  if (!requestedParsed) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      effectiveParameters: defaultParsed,
      rejectedPoolId: requested,
      rejectionReason: "INVALID_SCHEMA"
    });
  }

  return freezeDecision({
    selectedPoolId: requested,
    effectiveParameters: requestedParsed
  });
}

/**
 * Authoritative Parameter Pools (v1) — closed list per documentation.
 *
 * NOTE: Exact DecimalString values are implementation-specific (documented).
 * Step 4 does not interpret these values; they are opaque configuration.
 */
export const PARAMETER_POOLS_V1: Readonly<Record<string, StrategyParameterSet>> =
  Object.freeze({
    "cautious@v1": Object.freeze({
      holdTime: createDecimalString("10"),
      cooldownTime: createDecimalString("10"),
      switchingSensitivity: createDecimalString("0.25"),
      stabilityRequirement: createDecimalString("0.9")
    }),
    "balanced@v1": Object.freeze({
      holdTime: createDecimalString("5"),
      cooldownTime: createDecimalString("5"),
      switchingSensitivity: createDecimalString("0.5"),
      stabilityRequirement: createDecimalString("0.75")
    }),
    "assertive@v1": Object.freeze({
      holdTime: createDecimalString("2"),
      cooldownTime: createDecimalString("2"),
      switchingSensitivity: createDecimalString("0.75"),
      stabilityRequirement: createDecimalString("0.6")
    })
  });

/**
 * Exactly one pool MUST be marked as default (documented).
 */
export const DEFAULT_PARAMETER_POOL_ID_V1 = "cautious@v1" as const;

export function selectParameterPoolV1(
  context: ParameterSelectionContext
): ParameterSelectionDecision {
  return selectParameterPool(PARAMETER_POOLS_V1, DEFAULT_PARAMETER_POOL_ID_V1, context);
}

