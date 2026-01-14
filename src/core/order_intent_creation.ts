/**
 * Step 5 — OrderIntent Creation (v1-final)
 *
 * Sole authoritative sources:
 * - docs/core/ORDER_INTENT_CREATION.md (v1-final)
 * - docs/strategy/PARAMETER_POOLS.md (v1-final) for parameterPool.allocation
 *
 * Constraints:
 * - Pure, deterministic function
 * - Creates at most one OrderIntent OR an explicit NoIntent
 * - No execution, persistence, or state mutation
 */

import type { MarketId, OrderIntent, OrderIntentId, Position } from "./domain_types.js";
import type { ParameterPool } from "./parameter_pools.js";
import type { StrategyLifecycle } from "./strategy_lifecycle.js";
import type { AttentionWorthinessDecision } from "./attention_worthiness.js";
import type { LogicalTime, UUID } from "./value_objects.js";

export type SafetyGates = Readonly<{
  blockBuy: boolean;
  forceSell: boolean;
}>;

export type NoIntentReason =
  | "LIFECYCLE_BLOCKED"
  | "ATTENTION_NEGATIVE"
  | "HOLD_TIME_ACTIVE"
  | "COOLDOWN_ACTIVE"
  | "SAFETY_BLOCKED"
  | "MISSING_TARGET_MARKET"
  | "PRECONDITIONS_NOT_MET";

export type NoIntent = Readonly<{
  type: "NO_INTENT";
  reason: NoIntentReason;
}>;

export type OrderIntentCreationOutput = OrderIntent | NoIntent;

function noIntent(reason: NoIntentReason): NoIntent {
  return Object.freeze({ type: "NO_INTENT", reason });
}

/**
 * Deterministic OrderIntentId derivation.
 *
 * Rule (v1-final):
 * orderIntentId = hash(strategyInstanceId + marketId + side + logicalTime)
 */
export function deriveOrderIntentId(
  strategyInstanceId: UUID,
  marketId: MarketId,
  side: "BUY" | "SELL",
  logicalTime: LogicalTime
): OrderIntentId {
  const input = `${strategyInstanceId}${marketId}${side}${logicalTime}`;
  const h1 = fnv1a64(input);
  const h2 = fnv1a64(`salt:step5|${input}`);
  return `${toHex64(h1)}${toHex64(h2)}`;
}

function attentionAllowsEntry(attention: AttentionWorthinessDecision): boolean {
  // Gate-only: Step 5 treats upstream attention output as an immutable fact.
  return attention.type === "TARGET_MARKET_BETTER";
}

function attentionRecommendsRotation(attention: AttentionWorthinessDecision): boolean {
  return attention.type === "TARGET_MARKET_BETTER";
}

function getHeldPosition(lifecycle: StrategyLifecycle): Position | null {
  const s = lifecycle.state;
  if (s.tag === "HOLDING") return s.position;
  if (s.tag === "EXIT") return s.position;
  return null;
}

function isCooldownActive(lifecycle: StrategyLifecycle, now: LogicalTime): boolean {
  const s = lifecycle.state;
  if (s.tag !== "COOLDOWN") return false;
  return now < s.cooldownUntil;
}

function isHoldTimeActive(lifecycle: StrategyLifecycle, now: LogicalTime): boolean {
  const s = lifecycle.state;
  if (s.tag !== "HOLDING") return false;
  const expiresAt = (s.enteredAt + lifecycle.config.minimumHoldTime) as LogicalTime;
  return now < expiresAt;
}

function buyInProgress(lifecycle: StrategyLifecycle): boolean {
  return lifecycle.state.tag === "ENTRY";
}

function sellInProgress(lifecycle: StrategyLifecycle): boolean {
  return lifecycle.state.tag === "EXIT";
}

/**
 * Creates at most one intent per cycle, or an explicit NoIntent.
 *
 * NOTE: Structural violations MAY throw per spec. Domain-blocking returns NoIntent.
 */
export function createOrderIntentV1(input: Readonly<{
  strategyInstanceId: UUID;
  lifecycle: StrategyLifecycle;
  attention: AttentionWorthinessDecision;
  parameterPool: ParameterPool;
  targetMarketId?: MarketId;
  safetyGates: SafetyGates;
  logicalTime: LogicalTime;
}>): OrderIntentCreationOutput {
  const {
    strategyInstanceId,
    lifecycle,
    attention,
    parameterPool,
    targetMarketId,
    safetyGates,
    logicalTime
  } = input;

  // ---- SELL path (position exists) ----
  const position = getHeldPosition(lifecycle);
  if (position) {
    if (sellInProgress(lifecycle)) {
      return noIntent("LIFECYCLE_BLOCKED");
    }

    const lifecycleAllowsExit = lifecycle.state.tag === "HOLDING";
    if (!lifecycleAllowsExit) {
      return noIntent("LIFECYCLE_BLOCKED");
    }

    const rotationRecommended = attentionRecommendsRotation(attention);
    const allowedByGates = rotationRecommended || safetyGates.forceSell;
    if (!allowedByGates) {
      return noIntent("ATTENTION_NEGATIVE");
    }

    // Hold time blocks rotation sells, but Safety force-sell bypasses hold time.
    if (!safetyGates.forceSell && isHoldTimeActive(lifecycle, logicalTime)) {
      return noIntent("HOLD_TIME_ACTIVE");
    }

    const marketId = position.marketId;
    const id = deriveOrderIntentId(strategyInstanceId, marketId, "SELL", logicalTime);

    // SELL allocation equals the allocation value of the held position.
    // In v1 core types, Position.size is an opaque DecimalString. Step 5 treats it as
    // the "allocation value of the currently held position" for the SELL intent.
    const intent: OrderIntent = Object.freeze({
      id,
      side: "SELL",
      marketId,
      intent: Object.freeze({ type: "ALLOCATION", value: position.size })
    });
    return intent;
  }

  // ---- BUY path (no position exists) ----
  if (isCooldownActive(lifecycle, logicalTime)) {
    return noIntent("COOLDOWN_ACTIVE");
  }

  const lifecycleAllowsEntry = lifecycle.state.tag === "EVALUATION";
  if (!lifecycleAllowsEntry) {
    return noIntent("LIFECYCLE_BLOCKED");
  }

  if (!attentionAllowsEntry(attention)) {
    return noIntent("ATTENTION_NEGATIVE");
  }

  if (buyInProgress(lifecycle)) {
    return noIntent("PRECONDITIONS_NOT_MET");
  }

  if (safetyGates.blockBuy) {
    return noIntent("SAFETY_BLOCKED");
  }

  if (targetMarketId === undefined) {
    return noIntent("MISSING_TARGET_MARKET");
  }

  const id = deriveOrderIntentId(strategyInstanceId, targetMarketId, "BUY", logicalTime);
  const buy: OrderIntent = Object.freeze({
    id,
    side: "BUY",
    marketId: targetMarketId,
    intent: Object.freeze({ type: "ALLOCATION", value: parameterPool.allocation })
  });
  return buy;
}

// ---- Deterministic hashing helpers (no I/O, no randomness) ----

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const MASK_64 = (1n << 64n) - 1n;

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash;
}

function toHex64(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

