import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { auditSummary } from "../../../../../src/observer/api/http/handlers/auditSummary.js";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-observer-audit-summary-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeAuditEventsFile(rootDir: string, lines: string[]): void {
  const dataDir = path.join(rootDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "audit_events.ndjson"), lines.join("\n"), "utf8");
}

describe("Phase 2 — GET /v1/observe/persistence/audit-events/summary", () => {
  it("returns empty summary for missing file", () => {
    withTempDir((rootDir) => {
      const res = auditSummary(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, readFileSync: fs.readFileSync },
      );

      expect(res).toEqual({
        total_count: 0,
        counts_by_type: {},
        last_event_id: null,
        last_logical_time: null,
      });
      expect(Object.keys(res).sort()).toEqual(["counts_by_type", "last_event_id", "last_logical_time", "total_count"]);
      expect((res as any).events).toBeUndefined();
    });
  });

  it("returns empty summary for empty file", () => {
    withTempDir((rootDir) => {
      writeAuditEventsFile(rootDir, []);

      const res = auditSummary(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, readFileSync: fs.readFileSync },
      );

      expect(res).toEqual({
        total_count: 0,
        counts_by_type: {},
        last_event_id: null,
        last_logical_time: null,
      });
    });
  });

  it("aggregates counts by exact event type and returns last id/logical time", () => {
    withTempDir((rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({ id: "e1", type: "DECISION_EVALUATED", logicalTime: "1" }),
        JSON.stringify({ id: "e2", type: "ORDER_INTENT_CREATED", logicalTime: "2" }),
        JSON.stringify({ id: "e3", type: "DECISION_EVALUATED", logicalTime: "3" }),
      ]);

      const res = auditSummary(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, readFileSync: fs.readFileSync },
      );

      expect(res.total_count).toBe(3);
      expect(res.counts_by_type).toEqual({
        DECISION_EVALUATED: 2,
        ORDER_INTENT_CREATED: 1,
      });
      expect(res.last_event_id).toBe("e3");
      expect(res.last_logical_time).toBe("3");
      expect(Object.keys(res).sort()).toEqual(["counts_by_type", "last_event_id", "last_logical_time", "total_count"]);
      expect((res as any).events).toBeUndefined();
    });
  });

  it("counts repeated high-frequency event types without suppression", () => {
    withTempDir((rootDir) => {
      const lines: string[] = [];
      for (let i = 0; i < 200; i++) {
        lines.push(JSON.stringify({ id: `e${i}`, type: "LEDGER_UPDATED", logicalTime: String(i) }));
      }
      writeAuditEventsFile(rootDir, lines);

      const res = auditSummary(
        { headers: {}, query: {} },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, readFileSync: fs.readFileSync },
      );

      expect(res.total_count).toBe(200);
      expect(res.counts_by_type).toEqual({ LEDGER_UPDATED: 200 });
      expect(res.last_event_id).toBe("e199");
      expect(res.last_logical_time).toBe("199");
    });
  });
});

