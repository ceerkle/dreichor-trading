import type { ObserveDerivedShadowLedgerResponseV1 } from "../../contracts/v1/observe.contract.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObserveDerivedShadowLedgerHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

interface DerivedShadowLedgerDeps {
  snapshotsRootDir: string;
  existsSync: typeof fs.existsSync;
  createReadStream: typeof fs.createReadStream;
}

const DEFAULT_DEPS: DerivedShadowLedgerDeps = {
  snapshotsRootDir: "/var/lib/dreichor/snapshots",
  existsSync: fs.existsSync,
  createReadStream: fs.createReadStream,
};

function snapshotsNdjsonPathForRoot(rootDir: string): string {
  return path.join(rootDir, "data", "snapshots.ndjson");
}

function emptyShadowLedger(): ObserveDerivedShadowLedgerResponseV1 {
  // Phase 2 observes a Phase 1.5 PAPER-only runtime.
  return { shadow_ledger: { plane: "PAPER", positions: [] } };
}

type ParsedSnapshotShape = {
  type: unknown;
  plane: unknown;
  positions: unknown;
};

function validateSnapshotOrThrow(snapshot: ParsedSnapshotShape, filePath: string): void {
  if (snapshot.type !== "SHADOW_LEDGER_SNAPSHOT") {
    throw new ObserverError("INTERNAL_ERROR", `Latest snapshot is not a SHADOW_LEDGER_SNAPSHOT in '${filePath}'.`);
  }
  if (typeof snapshot.plane !== "string") {
    throw new ObserverError("INTERNAL_ERROR", `Snapshot is missing a string 'plane' field in '${filePath}'.`);
  }
  if (typeof snapshot.positions !== "object" || snapshot.positions === null || Array.isArray(snapshot.positions)) {
    throw new ObserverError("INTERNAL_ERROR", `Snapshot is missing an object 'positions' field in '${filePath}'.`);
  }
}

export async function derivedShadowLedger(
  _req: ObserveDerivedShadowLedgerHttpRequestV1,
  deps: DerivedShadowLedgerDeps = DEFAULT_DEPS,
): Promise<ObserveDerivedShadowLedgerResponseV1> {
  const filePath = snapshotsNdjsonPathForRoot(deps.snapshotsRootDir);

  let exists: boolean;
  try {
    exists = deps.existsSync(filePath);
  } catch (err: any) {
    throw new ObserverError(
      "INTERNAL_ERROR",
      `Filesystem exists check failed for '${filePath}': ${err?.message ?? String(err)}`,
    );
  }

  if (!exists) return emptyShadowLedger();

  const input = deps.createReadStream(filePath, { encoding: "utf8" });
  let ioError: unknown = null;
  input.once("error", (err) => {
    ioError = err;
  });

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lastLine: string | null = null;
  try {
    for await (const line of rl) {
      if (line.length === 0) continue;
      lastLine = line;
    }
  } finally {
    rl.close();
  }

  if (ioError) {
    const e: any = ioError;
    throw new ObserverError("INTERNAL_ERROR", `Filesystem read failed for '${filePath}': ${e?.message ?? String(e)}`);
  }

  if (lastLine === null) return emptyShadowLedger();

  let parsed: ParsedSnapshotShape;
  try {
    parsed = JSON.parse(lastLine) as ParsedSnapshotShape;
  } catch (err: any) {
    throw new ObserverError("INTERNAL_ERROR", `JSON parse failed for '${filePath}': ${err?.message ?? String(err)}`);
  }

  validateSnapshotOrThrow(parsed, filePath);

  const positions = Object.values(parsed.positions as Record<string, any>);
  return { shadow_ledger: { plane: parsed.plane as string, positions } };
}

