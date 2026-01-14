/**
 * Step 3 — Attention & Worthiness Evaluation (deterministic combination only)
 *
 * Source of truth:
 * - docs/strategy/ATTENTION_WORTHINESS_MODEL.md
 *
 * IMPORTANT (Option A constraint):
 * - All qualitative concepts are treated as already-evaluated boolean facts.
 * - This module MUST NOT derive, infer, or threshold these facts from data.
 * - Pure, deterministic combination logic only.
 */

/**
 * Authoritative, pre-evaluated facts provided to the attention model.
 * These correspond to the documented gating statements like:
 * - "attention is meaningfully higher"
 * - "stability meets minimum requirements"
 * - "confidence is sufficient"
 * - "difference persists over time"
 * - "switching costs are justified"
 */
export type AttentionWorthinessInputs = Readonly<{
  attentionMeaningfullyHigher: boolean;
  stabilityMeetsMinimum: boolean;
  confidenceSufficient: boolean;
  differencePersistsOverTime: boolean;
  switchingCostsJustified: boolean;
}>;

export type AttentionWorthinessGateCode =
  | "ATTENTION_MEANINGFULLY_HIGHER"
  | "STABILITY_MEETS_MINIMUM"
  | "CONFIDENCE_SUFFICIENT"
  | "DIFFERENCE_PERSISTS_OVER_TIME"
  | "SWITCHING_COSTS_JUSTIFIED";

export type AttentionWorthinessReason = Readonly<{
  code: AttentionWorthinessGateCode;
  satisfied: boolean;
}>;

export type AttentionWorthinessDecision =
  | Readonly<{
      type: "TARGET_MARKET_BETTER";
      reasons: ReadonlyArray<AttentionWorthinessReason>;
    }>
  | Readonly<{
      type: "NO_ROTATION";
      reasons: ReadonlyArray<AttentionWorthinessReason>;
    }>;

/**
 * Deterministically decides whether a target market is "better" (and therefore
 * rotation-permitted within this model) based solely on authoritative boolean inputs.
 *
 * Rule (documented, qualitative → boolean facts):
 * A market may be considered better only if ALL gates are satisfied.
 * If not, no rotation occurs.
 */
export function decideAttentionWorthiness(
  inputs: AttentionWorthinessInputs
): AttentionWorthinessDecision {
  const reasons: ReadonlyArray<AttentionWorthinessReason> = [
    {
      code: "ATTENTION_MEANINGFULLY_HIGHER",
      satisfied: inputs.attentionMeaningfullyHigher
    },
    { code: "STABILITY_MEETS_MINIMUM", satisfied: inputs.stabilityMeetsMinimum },
    { code: "CONFIDENCE_SUFFICIENT", satisfied: inputs.confidenceSufficient },
    {
      code: "DIFFERENCE_PERSISTS_OVER_TIME",
      satisfied: inputs.differencePersistsOverTime
    },
    {
      code: "SWITCHING_COSTS_JUSTIFIED",
      satisfied: inputs.switchingCostsJustified
    }
  ];

  const allSatisfied = reasons.every((r) => r.satisfied);
  return allSatisfied
    ? { type: "TARGET_MARKET_BETTER", reasons }
    : { type: "NO_ROTATION", reasons };
}

