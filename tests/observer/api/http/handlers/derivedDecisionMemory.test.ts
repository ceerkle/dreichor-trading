import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { derivedDecisionMemory } from "../../../../../src/observer/api/http/handlers/derivedDecisionMemory.js";

function withTempDir<T>(fn: (dir: string) => T | Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-observer-derived-dm-"));
  const p = Promise.resolve(fn(dir));
  return p.finally(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function writeAuditEventsFile(rootDir: string, lines: string[]): void {
  const dataDir = path.join(rootDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "audit_events.ndjson"), lines.join("\n"), "utf8");
}

describe("Phase 2 — GET /v1/observe/derived/decision-memory", () => {
  it("treats missing audit-events file as empty input", async () => {
    await withTempDir(async (rootDir) => {
      const res = await derivedDecisionMemory(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res).toEqual({
        decision_memory: {
          version: 1,
          entries: {},
          seenInputIds: {},
        },
      });
    });
  });

  it("treats empty file as empty input", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, []);

      const res = await derivedDecisionMemory(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res).toEqual({
        decision_memory: {
          version: 1,
          entries: {},
          seenInputIds: {},
        },
      });
    });
  });

  it("reconstructs DecisionMemory deterministically from a minimal valid event sequence", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({
          id: "a1",
          type: "DECISION_EVALUATED",
          version: 1,
          logicalTime: "1",
          createdAtLogical: "1",
          decisionId: "d1",
          strategyInstanceId: "s1",
          decisionClass: "decision.class@v1",
        }),
        JSON.stringify({
          id: "a2",
          type: "SAFETY_EVALUATED",
          version: 1,
          logicalTime: "2",
          createdAtLogical: "2",
          decisionId: "d1",
          result: { type: "ALLOW" },
        }),
        JSON.stringify({
          id: "a3",
          type: "EXECUTION_OUTCOME_RECORDED",
          version: 1,
          logicalTime: "3",
          createdAtLogical: "3",
          decisionId: "d1",
          executionId: "x1",
          status: "FILLED",
        }),
        JSON.stringify({
          id: "a4",
          type: "USER_FEEDBACK_RECORDED",
          version: 1,
          logicalTime: "4",
          createdAtLogical: "4",
          feedbackId: "a4",
          category: "DECISION_QUALITY",
          target: { type: "DECISION", decisionId: "d1" },
        }),
      ]);

      const res = await derivedDecisionMemory(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res).toEqual({
        decision_memory: {
          version: 1,
          entries: {
            d1: {
              decisionId: "d1",
              decisionClass: "decision.class@v1",
              firstSeenLogicalTime: "1",
              execution: {
                executionsObserved: 1,
                filledCount: 1,
                failedCount: 0,
                lastExecutionStatus: "FILLED",
              },
              safety: {
                evaluationsObserved: 1,
                blockedCount: 0,
                forcedSellCount: 0,
                lastSafetyResult: { type: "ALLOW" },
              },
              feedback: {
                feedbackCount: 1,
                categories: {
                  DECISION_QUALITY: 1,
                  RISK_COMFORT: 0,
                  SYSTEM_BEHAVIOR: 0,
                },
              },
            },
          },
          seenInputIds: {
            a1: true,
            a2: true,
            a3: true,
            a4: true,
          },
        },
      });
    });
  });

  it("is idempotent with repeated inputs (same id)", async () => {
    await withTempDir(async (rootDir) => {
      const safety = JSON.stringify({
        id: "a2",
        type: "SAFETY_EVALUATED",
        version: 1,
        logicalTime: "2",
        createdAtLogical: "2",
        decisionId: "d1",
        result: { type: "ALLOW" },
      });

      writeAuditEventsFile(rootDir, [
        JSON.stringify({
          id: "a1",
          type: "DECISION_EVALUATED",
          version: 1,
          logicalTime: "1",
          createdAtLogical: "1",
          decisionId: "d1",
          strategyInstanceId: "s1",
          decisionClass: "decision.class@v1",
        }),
        safety,
        safety, // repeated, same id
      ]);

      const res = await derivedDecisionMemory(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.decision_memory.entries.d1.safety.evaluationsObserved).toBe(1);
      expect(res.decision_memory.seenInputIds).toEqual({ a1: true, a2: true });
    });
  });

  it("fails on malformed JSON (no partial state)", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, ["{"]);

      await expect(
        derivedDecisionMemory(
          { headers: {}, query: {} },
          { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
        ),
      ).rejects.toMatchObject({ name: "ObserverError", code: "INTERNAL_ERROR" });
    });
  });

  it("fails on invalid reducer input (audit event without decisionId)", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({
          id: "a1",
          type: "DECISION_EVALUATED",
          version: 1,
          logicalTime: "1",
          createdAtLogical: "1",
          decisionId: "d1",
          strategyInstanceId: "s1",
          decisionClass: "decision.class@v1",
        }),
        JSON.stringify({
          id: "b1",
          type: "LEDGER_UPDATED",
          version: 1,
          logicalTime: "2",
          createdAtLogical: "2",
          plane: "paper",
          marketId: "m1",
        }),
      ]);

      await expect(
        derivedDecisionMemory(
          { headers: {}, query: {} },
          { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
        ),
      ).rejects.toMatchObject({ name: "ObserverError", code: "INTERNAL_ERROR" });
    });
  });
});

