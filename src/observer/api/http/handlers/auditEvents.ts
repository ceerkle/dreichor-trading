import type {
  AuditEventV1,
  ObservePersistenceAuditEventsRequestV1,
  ObservePersistenceAuditEventsResponseV1,
} from "../../contracts/v1/observe.contract.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistenceAuditEventsHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: ObservePersistenceAuditEventsRequestV1;
}

interface AuditEventsDeps {
  auditEventsRootDir: string;
  existsSync: typeof fs.existsSync;
  createReadStream: typeof fs.createReadStream;
}

const MAX_LIMIT = 1000;

const DEFAULT_DEPS: AuditEventsDeps = {
  auditEventsRootDir: "/var/lib/dreichor/audit-events",
  existsSync: fs.existsSync,
  createReadStream: fs.createReadStream,
};

function auditEventsNdjsonPathForRoot(rootDir: string): string {
  return path.join(rootDir, "data", "audit_events.ndjson");
}

function parseAndValidateLimit(limit: number | null): number | null {
  if (limit === null) return null;

  if (!Number.isFinite(limit)) {
    throw new ObserverError("BAD_REQUEST", "Query parameter 'limit' must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ObserverError("BAD_REQUEST", "Query parameter 'limit' must be a positive integer.");
  }
  if (limit > MAX_LIMIT) {
    throw new ObserverError("BAD_REQUEST", `Query parameter 'limit' must be <= ${MAX_LIMIT}.`);
  }
  return limit;
}

async function readNdjsonEventsOrThrow(filePath: string, deps: AuditEventsDeps, limit: number | null): Promise<unknown[]> {
  const input = deps.createReadStream(filePath, { encoding: "utf8" });

  let ioError: unknown = null;
  input.once("error", (err) => {
    ioError = err;
  });

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const all: unknown[] = [];
  const rolling: unknown[] = [];

  try {
    for await (const line of rl) {
      if (line.length === 0) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (err: any) {
        throw new ObserverError("INTERNAL_ERROR", `JSON parse failed for '${filePath}': ${err?.message ?? String(err)}`);
      }

      if (limit === null) {
        all.push(parsed);
      } else {
        rolling.push(parsed);
        if (rolling.length > limit) rolling.shift();
      }
    }
  } catch (err) {
    rl.close();
    input.destroy();
    throw err;
  } finally {
    rl.close();
  }

  if (ioError) {
    const e: any = ioError;
    throw new ObserverError("INTERNAL_ERROR", `Filesystem read failed for '${filePath}': ${e?.message ?? String(e)}`);
  }

  return limit === null ? all : rolling;
}

export async function auditEvents(
  req: ObservePersistenceAuditEventsHttpRequestV1,
  deps: AuditEventsDeps = DEFAULT_DEPS,
): Promise<ObservePersistenceAuditEventsResponseV1> {
  const limit = parseAndValidateLimit(req.query.limit);
  const filePath = auditEventsNdjsonPathForRoot(deps.auditEventsRootDir);

  let exists: boolean;
  try {
    exists = deps.existsSync(filePath);
  } catch (err: any) {
    throw new ObserverError(
      "INTERNAL_ERROR",
      `Filesystem exists check failed for '${filePath}': ${err?.message ?? String(err)}`,
    );
  }

  if (!exists) return { events: [] };

  const raw = await readNdjsonEventsOrThrow(filePath, deps, limit);
  return { events: raw as AuditEventV1[] };
}

