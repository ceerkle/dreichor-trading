import { describe, expect, it } from "vitest";

import {
  DEFAULT_PARAMETER_POOL_ID_V1,
  PARAMETER_POOLS_V1,
  selectParameterPool,
  selectParameterPoolV1
} from "../../src/core/index.js";

describe("Step 4 — Parameter Pool Selection", () => {
  it("selects the default pool when no requestedPoolId is provided", () => {
    const decision = selectParameterPoolV1({});
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
    expect(decision.rejectedPoolId).toBeUndefined();
    expect(decision.rejectionReason).toBeUndefined();
  });

  it("selects a requested pool when it exists and has a valid schema", () => {
    const decision = selectParameterPoolV1({ requestedPoolId: "balanced@v1" });
    expect(decision.selectedPoolId).toBe("balanced@v1");
    expect(decision.rejectedPoolId).toBeUndefined();
    expect(decision.rejectionReason).toBeUndefined();
  });

  it("falls back to default and records UNKNOWN_POOL when requestedPoolId does not exist", () => {
    const decision = selectParameterPoolV1({ requestedPoolId: "does-not-exist@v1" });
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
    expect(decision.rejectedPoolId).toBe("does-not-exist@v1");
    expect(decision.rejectionReason).toBe("UNKNOWN_POOL");
  });

  it("falls back to default and records INVALID_SCHEMA when requestedPoolId exists but violates schema", () => {
    const catalog = {
      ...PARAMETER_POOLS_V1,
      "broken@v1": {
        holdTime: "1",
        cooldownTime: "2",
        switchingSensitivity: "3"
        // stabilityRequirement missing
      }
    };
    const decision = selectParameterPool(catalog, DEFAULT_PARAMETER_POOL_ID_V1, {
      requestedPoolId: "broken@v1"
    });
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
    expect(decision.rejectedPoolId).toBe("broken@v1");
    expect(decision.rejectionReason).toBe("INVALID_SCHEMA");
  });

  it("treats unknown keys as invalid schema (boundary enforcement)", () => {
    const catalog = {
      ...PARAMETER_POOLS_V1,
      "extra-key@v1": {
        holdTime: "1",
        cooldownTime: "2",
        switchingSensitivity: "3",
        stabilityRequirement: "4",
        extra: "5"
      }
    };
    const decision = selectParameterPool(catalog, DEFAULT_PARAMETER_POOL_ID_V1, {
      requestedPoolId: "extra-key@v1"
    });
    expect(decision.rejectionReason).toBe("INVALID_SCHEMA");
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
  });

  it("treats invalid types as invalid schema (boundary enforcement)", () => {
    const catalog = {
      ...PARAMETER_POOLS_V1,
      "wrong-type@v1": {
        holdTime: 1,
        cooldownTime: "2",
        switchingSensitivity: "3",
        stabilityRequirement: "4"
      }
    };
    const decision = selectParameterPool(catalog, DEFAULT_PARAMETER_POOL_ID_V1, {
      requestedPoolId: "wrong-type@v1"
    });
    expect(decision.rejectionReason).toBe("INVALID_SCHEMA");
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
  });

  it("treats invalid DecimalString values as invalid schema (boundary enforcement)", () => {
    const catalog = {
      ...PARAMETER_POOLS_V1,
      "bad-decimal@v1": {
        holdTime: "1e5", // exponent notation is invalid for DecimalString
        cooldownTime: "2",
        switchingSensitivity: "3",
        stabilityRequirement: "4"
      }
    };
    const decision = selectParameterPool(catalog, DEFAULT_PARAMETER_POOL_ID_V1, {
      requestedPoolId: "bad-decimal@v1"
    });
    expect(decision.rejectionReason).toBe("INVALID_SCHEMA");
    expect(decision.selectedPoolId).toBe(DEFAULT_PARAMETER_POOL_ID_V1);
  });

  it("keeps the authoritative pool catalog immutable (frozen)", () => {
    expect(Object.isFrozen(PARAMETER_POOLS_V1)).toBe(true);
    expect(Object.isFrozen(PARAMETER_POOLS_V1["cautious@v1"])).toBe(true);

    expect(() => {
      (PARAMETER_POOLS_V1 as any)["cautious@v1"].holdTime = "999";
    }).toThrow();
  });

  it("returns an immutable selection decision and parameter set", () => {
    const decision = selectParameterPoolV1({ requestedPoolId: "assertive@v1" });
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.effectiveParameters)).toBe(true);
  });
});

