/**
 * Step 4 — Parameter Pool Selection (v1-final)
 *
 * Source of truth:
 * - docs/strategy/PARAMETER_POOLS.md (v1-final)
 *
 * Constraints (Step 4):
 * - Static pools only (finite, named, versioned)
 * - Deterministic selection (no randomness, no learning, no optimization)
 * - Validation is schema-only (missing key / unknown key / invalid type)
 * - No semantic interpretation outside consuming steps
 */

import {
  createDecimalString,
  createLogicalTime,
  type DecimalString,
  type LogicalTime
} from "./value_objects.js";

/**
 * Required Pool Schema (v1)
 *
 * ParameterPool {
 *   id: string
 *   version: string
 *   allocation: DecimalString
 *   holdTime: LogicalTime
 *   cooldownTime: LogicalTime
 *   switchingSensitivity: DecimalString
 *   stabilityRequirement: DecimalString
 * }
 */
export type ParameterPool = Readonly<{
  id: string;
  version: string;
  allocation: DecimalString;
  holdTime: LogicalTime;
  cooldownTime: LogicalTime;
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
  parameterPool: ParameterPool;
  rejectedPoolId?: string;
  rejectionReason?: ParameterSelectionRejectionReason;
}>;

export type ParameterPoolCatalog = Readonly<Record<string, unknown>>;

const PARAMETER_POOL_KEYS = [
  "id",
  "version",
  "allocation",
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
  Object.freeze(decision.parameterPool);
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
 */
function tryParseParameterPool(value: unknown): ParameterPool | null {
  if (!isPlainObject(value)) return null;

  const keys = Object.keys(value).sort();
  const expected = [...PARAMETER_POOL_KEYS].sort();
  if (keys.length !== expected.length) return null;
  for (let i = 0; i < expected.length; i++) {
    if (keys[i] !== expected[i]) return null;
  }

  const id = value.id;
  const version = value.version;
  const allocation = value.allocation;
  const holdTime = value.holdTime;
  const cooldownTime = value.cooldownTime;
  const switchingSensitivity = value.switchingSensitivity;
  const stabilityRequirement = value.stabilityRequirement;

  if (
    typeof id !== "string" ||
    typeof version !== "string" ||
    typeof allocation !== "string" ||
    typeof holdTime !== "number" ||
    typeof cooldownTime !== "number" ||
    typeof switchingSensitivity !== "string" ||
    typeof stabilityRequirement !== "string"
  ) {
    return null;
  }

  try {
    return Object.freeze({
      id,
      version,
      allocation: createDecimalString(allocation),
      holdTime: createLogicalTime(holdTime),
      cooldownTime: createLogicalTime(cooldownTime),
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
  const defaultParsed = tryParseParameterPool(defaultRaw);
  if (!defaultParsed) {
    throw new Error("Default parameter pool is missing or has an invalid schema");
  }

  const requested = context.requestedPoolId;
  if (requested === undefined) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      parameterPool: defaultParsed
    });
  }

  const requestedRaw = catalog[requested];
  if (requestedRaw === undefined) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      parameterPool: defaultParsed,
      rejectedPoolId: requested,
      rejectionReason: "UNKNOWN_POOL"
    });
  }

  const requestedParsed = tryParseParameterPool(requestedRaw);
  if (!requestedParsed) {
    return freezeDecision({
      selectedPoolId: defaultPoolId,
      parameterPool: defaultParsed,
      rejectedPoolId: requested,
      rejectionReason: "INVALID_SCHEMA"
    });
  }

  return freezeDecision({
    selectedPoolId: requested,
    parameterPool: requestedParsed
  });
}

/**
 * Authoritative Parameter Pools (v1) — closed list per documentation.
 *
 * NOTE: Exact DecimalString values are implementation-specific (documented).
 * Step 4 does not interpret these values; they are opaque configuration.
 */
export const PARAMETER_POOLS_V1: Readonly<Record<string, ParameterPool>> =
  Object.freeze({
    "cautious@v1": Object.freeze({
      id: "cautious@v1",
      version: "v1",
      allocation: createDecimalString("1"),
      holdTime: createLogicalTime(10),
      cooldownTime: createLogicalTime(10),
      switchingSensitivity: createDecimalString("0.25"),
      stabilityRequirement: createDecimalString("0.9")
    }),
    "balanced@v1": Object.freeze({
      id: "balanced@v1",
      version: "v1",
      allocation: createDecimalString("1"),
      holdTime: createLogicalTime(5),
      cooldownTime: createLogicalTime(5),
      switchingSensitivity: createDecimalString("0.5"),
      stabilityRequirement: createDecimalString("0.75")
    }),
    "assertive@v1": Object.freeze({
      id: "assertive@v1",
      version: "v1",
      allocation: createDecimalString("1"),
      holdTime: createLogicalTime(2),
      cooldownTime: createLogicalTime(2),
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

