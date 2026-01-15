import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { derivedShadowLedger } from "../../../../../src/observer/api/http/handlers/derivedShadowLedger.js";

function withTempDir<T>(fn: (dir: string) => T | Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-observer-derived-sl-"));
  const p = Promise.resolve(fn(dir));
  return p.finally(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function writeSnapshotsFile(rootDir: string, lines: string[]): void {
  const dataDir = path.join(rootDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "snapshots.ndjson"), lines.join("\n"), "utf8");
}

describe("Phase 2 — GET /v1/observe/derived/shadow-ledger", () => {
  it("returns empty shadow ledger for missing snapshot file", async () => {
    await withTempDir(async (rootDir) => {
      const res = await derivedShadowLedger(
        { headers: {}, query: {} },
        { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );
      expect(res).toEqual({ shadow_ledger: { plane: "PAPER", positions: [] } });
      expect(Object.keys(res)).toEqual(["shadow_ledger"]);
    });
  });

  it("returns empty shadow ledger for empty snapshot file", async () => {
    await withTempDir(async (rootDir) => {
      writeSnapshotsFile(rootDir, []);
      const res = await derivedShadowLedger(
        { headers: {}, query: {} },
        { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );
      expect(res).toEqual({ shadow_ledger: { plane: "PAPER", positions: [] } });
    });
  });

  it("uses the latest snapshot line and returns expected ledger state (minimal snapshot)", async () => {
    await withTempDir(async (rootDir) => {
      writeSnapshotsFile(rootDir, [
        JSON.stringify({
          snapshotId: "s0",
          type: "SHADOW_LEDGER_SNAPSHOT",
          version: 1,
          logicalTime: "1",
          plane: "PAPER",
          positions: {},
        }),
      ]);

      const res = await derivedShadowLedger(
        { headers: {}, query: {} },
        { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res).toEqual({ shadow_ledger: { plane: "PAPER", positions: [] } });
      expect((res as any).timeline).toBeUndefined();
      expect((res as any).cursor).toBeUndefined();
    });
  });

  it("returns positions from snapshot (multiple positions)", async () => {
    await withTempDir(async (rootDir) => {
      writeSnapshotsFile(rootDir, [
        JSON.stringify({
          snapshotId: "s1",
          type: "SHADOW_LEDGER_SNAPSHOT",
          version: 1,
          logicalTime: "2",
          plane: "PAPER",
          positions: {
            "BTC-USDT": { marketId: "BTC-USDT", quantity: "1.0", isOpen: true, lastExecutionId: "x1" },
            "ETH-USDT": { marketId: "ETH-USDT", quantity: "0", isOpen: false, lastExecutionId: "x2" },
          },
        }),
      ]);

      const res = await derivedShadowLedger(
        { headers: {}, query: {} },
        { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
      );

      expect(res.shadow_ledger.plane).toBe("PAPER");
      expect(res.shadow_ledger.positions).toEqual([
        { marketId: "BTC-USDT", quantity: "1.0", isOpen: true, lastExecutionId: "x1" },
        { marketId: "ETH-USDT", quantity: "0", isOpen: false, lastExecutionId: "x2" },
      ]);
    });
  });

  it("fails on malformed JSON", async () => {
    await withTempDir(async (rootDir) => {
      writeSnapshotsFile(rootDir, ["{"]);
      await expect(
        derivedShadowLedger(
          { headers: {}, query: {} },
          { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
        ),
      ).rejects.toMatchObject({ name: "ObserverError", code: "INTERNAL_ERROR" });
    });
  });

  it("fails when snapshot is missing required fields", async () => {
    await withTempDir(async (rootDir) => {
      writeSnapshotsFile(rootDir, [
        JSON.stringify({
          snapshotId: "s1",
          type: "SHADOW_LEDGER_SNAPSHOT",
          version: 1,
          logicalTime: "2",
          // plane missing
          positions: {},
        }),
      ]);

      await expect(
        derivedShadowLedger(
          { headers: {}, query: {} },
          { snapshotsRootDir: rootDir, existsSync: fs.existsSync, createReadStream: fs.createReadStream },
        ),
      ).rejects.toMatchObject({ name: "ObserverError", code: "INTERNAL_ERROR" });
    });
  });
});

