import { describe, expect, it } from "vitest";

import { decideAttentionWorthiness } from "../../src/core/index.js";

describe("Step 3 — Attention & Worthiness Evaluation (deterministic combination)", () => {
  it("permits rotation only when all gates are satisfied", () => {
    const result = decideAttentionWorthiness({
      attentionMeaningfullyHigher: true,
      stabilityMeetsMinimum: true,
      confidenceSufficient: true,
      differencePersistsOverTime: true,
      switchingCostsJustified: true
    });

    expect(result.type).toBe("TARGET_MARKET_BETTER");
    expect(result.reasons.map((r) => r.satisfied)).toEqual([
      true,
      true,
      true,
      true,
      true
    ]);
  });

  it("returns NO_ROTATION and exposes which gates failed (stable order)", () => {
    const result = decideAttentionWorthiness({
      attentionMeaningfullyHigher: true,
      stabilityMeetsMinimum: false,
      confidenceSufficient: true,
      differencePersistsOverTime: false,
      switchingCostsJustified: true
    });

    expect(result.type).toBe("NO_ROTATION");
    expect(result.reasons).toEqual([
      { code: "ATTENTION_MEANINGFULLY_HIGHER", satisfied: true },
      { code: "STABILITY_MEETS_MINIMUM", satisfied: false },
      { code: "CONFIDENCE_SUFFICIENT", satisfied: true },
      { code: "DIFFERENCE_PERSISTS_OVER_TIME", satisfied: false },
      { code: "SWITCHING_COSTS_JUSTIFIED", satisfied: true }
    ]);
  });
});

