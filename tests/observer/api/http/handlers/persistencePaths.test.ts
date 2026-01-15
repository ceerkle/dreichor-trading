import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { persistencePaths } from "../../../../../src/observer/api/http/handlers/persistencePaths.js";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-observer-paths-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("Phase 2 — GET /v1/observe/persistence/paths", () => {
  it("returns exists=true and size_bytes for both paths when both exist", () => {
    withTempDir((dir) => {
      const audit = path.join(dir, "audit-events.ndjson");
      const snaps = path.join(dir, "snapshots.ndjson");

      fs.writeFileSync(audit, "abc");
      fs.writeFileSync(snaps, "0123456789");

      const res = persistencePaths(
        { headers: {}, query: {} },
        { auditEventsPath: audit, snapshotsPath: snaps, statSync: fs.statSync },
      );

      expect(res.audit_events).toEqual({ path: audit, exists: true, size_bytes: 3 });
      expect(res.snapshots).toEqual({ path: snaps, exists: true, size_bytes: 10 });
    });
  });

  it("returns one existing and one missing when only one exists", () => {
    withTempDir((dir) => {
      const audit = path.join(dir, "audit-events.ndjson");
      const snaps = path.join(dir, "snapshots.ndjson");

      fs.writeFileSync(audit, "x");

      const res = persistencePaths(
        { headers: {}, query: {} },
        { auditEventsPath: audit, snapshotsPath: snaps, statSync: fs.statSync },
      );

      expect(res.audit_events).toEqual({ path: audit, exists: true, size_bytes: 1 });
      expect(res.snapshots).toEqual({ path: snaps, exists: false, size_bytes: null });
    });
  });

  it("returns exists=false and size_bytes=null for both when both are missing", () => {
    withTempDir((dir) => {
      const audit = path.join(dir, "audit-events.ndjson");
      const snaps = path.join(dir, "snapshots.ndjson");

      const res = persistencePaths(
        { headers: {}, query: {} },
        { auditEventsPath: audit, snapshotsPath: snaps, statSync: fs.statSync },
      );

      expect(res.audit_events).toEqual({ path: audit, exists: false, size_bytes: null });
      expect(res.snapshots).toEqual({ path: snaps, exists: false, size_bytes: null });
    });
  });
});

