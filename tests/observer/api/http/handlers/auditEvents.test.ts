import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { auditEvents } from "../../../../../src/observer/api/http/handlers/auditEvents.js";
import { ObserverError } from "../../../../../src/observer/errors/ObserverError.js";

function withTempDir<T>(fn: (dir: string) => T | Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-observer-audit-events-"));
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

describe("Phase 2 — GET /v1/observe/persistence/audit-events", () => {
  it("returns empty events array for missing file", async () => {
    await withTempDir(async (rootDir) => {
      const res = await auditEvents(
        { headers: {}, query: { limit: null } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );
      expect(res).toEqual({ events: [] });
      expect(Object.keys(res)).toEqual(["events"]);
      expect((res as any).cursor).toBeUndefined();
      expect((res as any).next).toBeUndefined();
    });
  });

  it("returns empty events array for empty file", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, []);
      const res = await auditEvents(
        { headers: {}, query: { limit: null } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );
      expect(res).toEqual({ events: [] });
    });
  });

  it("returns all events when limit is null", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({ id: "e1", type: "DECISION_EVALUATED", version: 1, logicalTime: "1", createdAtLogical: "1" }),
        JSON.stringify({ id: "e2", type: "LEDGER_UPDATED", version: 1, logicalTime: "2", createdAtLogical: "2" }),
      ]);

      const res = await auditEvents(
        { headers: {}, query: { limit: null } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.events).toHaveLength(2);
      expect((res.events as any[])[0].id).toBe("e1");
      expect((res.events as any[])[1].id).toBe("e2");
      expect(Object.keys(res)).toEqual(["events"]);
    });
  });

  it("limit=1 returns last event only", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({ id: "e1", type: "DECISION_EVALUATED", version: 1, logicalTime: "1", createdAtLogical: "1" }),
        JSON.stringify({ id: "e2", type: "LEDGER_UPDATED", version: 1, logicalTime: "2", createdAtLogical: "2" }),
      ]);

      const res = await auditEvents(
        { headers: {}, query: { limit: 1 } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.events).toHaveLength(1);
      expect((res.events as any[])[0].id).toBe("e2");
    });
  });

  it("limit smaller than total returns last N in persisted order", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({ id: "e1", type: "X", version: 1, logicalTime: "1", createdAtLogical: "1" }),
        JSON.stringify({ id: "e2", type: "X", version: 1, logicalTime: "2", createdAtLogical: "2" }),
        JSON.stringify({ id: "e3", type: "Y", version: 1, logicalTime: "3", createdAtLogical: "3" }),
      ]);

      const res = await auditEvents(
        { headers: {}, query: { limit: 2 } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.events).toHaveLength(2);
      expect((res.events as any[]).map((e) => e.id)).toEqual(["e2", "e3"]);
      expect(Object.keys(res)).toEqual(["events"]);
    });
  });

  it("limit larger than total returns all events", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [
        JSON.stringify({ id: "e1", type: "A", version: 1, logicalTime: "1", createdAtLogical: "1" }),
      ]);

      const res = await auditEvents(
        { headers: {}, query: { limit: 10 } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.events).toHaveLength(1);
      expect((res.events as any[])[0].id).toBe("e1");
    });
  });

  it("invalid limit throws BAD_REQUEST (0, negative, non-integer)", async () => {
    await withTempDir(async (rootDir) => {
      writeAuditEventsFile(rootDir, [JSON.stringify({ id: "e1", type: "A", version: 1, logicalTime: "1", createdAtLogical: "1" })]);

      const cases = [0, -1, 1.1];
      for (const limit of cases) {
        await expect(
          auditEvents(
            { headers: {}, query: { limit: limit as any } },
            { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
          ),
        ).rejects.toMatchObject({ name: "ObserverError", code: "BAD_REQUEST" } satisfies Partial<ObserverError>);
      }
    });
  });

  it("high-frequency events are returned without timeline/pagination metadata", async () => {
    await withTempDir(async (rootDir) => {
      const lines: string[] = [];
      for (let i = 0; i < 50; i++) {
        lines.push(JSON.stringify({ id: `e${i}`, type: "LEDGER_UPDATED", version: 1, logicalTime: String(i), createdAtLogical: String(i) }));
      }
      writeAuditEventsFile(rootDir, lines);

      const res = await auditEvents(
        { headers: {}, query: { limit: 10 } },
        { auditEventsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.events).toHaveLength(10);
      expect((res.events as any[])[0].id).toBe("e40");
      expect((res.events as any[])[9].id).toBe("e49");
      expect(Object.keys(res)).toEqual(["events"]);
      expect((res as any).cursor).toBeUndefined();
      expect((res as any).next_cursor).toBeUndefined();
      expect((res as any).page).toBeUndefined();
    });
  });
});

