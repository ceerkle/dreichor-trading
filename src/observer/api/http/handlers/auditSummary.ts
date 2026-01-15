import type { ObservePersistenceAuditEventsSummaryResponseV1 } from "../../contracts/v1/observe.contract.js";
import * as fs from "node:fs";
import * as path from "node:path";

import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistenceAuditEventsSummaryHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

interface AuditSummaryDeps {
  auditEventsRootDir: string;
  existsSync: typeof fs.existsSync;
  readFileSync: typeof fs.readFileSync;
}

const DEFAULT_DEPS: AuditSummaryDeps = {
  auditEventsRootDir: "/var/lib/dreichor/audit-events",
  existsSync: fs.existsSync,
  readFileSync: fs.readFileSync,
};

function auditEventsNdjsonPathForRoot(rootDir: string): string {
  return path.join(rootDir, "data", "audit_events.ndjson");
}

function emptySummary(): ObservePersistenceAuditEventsSummaryResponseV1 {
  return {
    total_count: 0,
    counts_by_type: {},
    last_event_id: null,
    last_logical_time: null,
  };
}

type ParsedAuditEventShape = {
  id: unknown;
  type: unknown;
  logicalTime: unknown;
};

export function auditSummary(
  _req: ObservePersistenceAuditEventsSummaryHttpRequestV1,
  deps: AuditSummaryDeps = DEFAULT_DEPS,
): ObservePersistenceAuditEventsSummaryResponseV1 {
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

  if (!exists) return emptySummary();

  let raw: string;
  try {
    raw = deps.readFileSync(filePath, "utf8");
  } catch (err: any) {
    throw new ObserverError("INTERNAL_ERROR", `Filesystem read failed for '${filePath}': ${err?.message ?? String(err)}`);
  }

  if (raw.trim().length === 0) return emptySummary();

  const counts = new Map<string, number>();
  let total = 0;
  let last_event_id: string | null = null;
  let last_logical_time: string | null = null;

  const lines = raw.split("\n").filter((l) => l.length > 0);
  for (const line of lines) {
    let parsed: ParsedAuditEventShape;
    try {
      parsed = JSON.parse(line) as ParsedAuditEventShape;
    } catch (err: any) {
      throw new ObserverError("INTERNAL_ERROR", `JSON parse failed for '${filePath}': ${err?.message ?? String(err)}`);
    }

    if (typeof parsed?.type !== "string") {
      throw new ObserverError("INTERNAL_ERROR", `Audit event is missing a string 'type' field in '${filePath}'.`);
    }
    if (typeof parsed?.id !== "string") {
      throw new ObserverError("INTERNAL_ERROR", `Audit event is missing a string 'id' field in '${filePath}'.`);
    }
    if (typeof parsed?.logicalTime !== "string") {
      throw new ObserverError("INTERNAL_ERROR", `Audit event is missing a string 'logicalTime' field in '${filePath}'.`);
    }

    total += 1;
    counts.set(parsed.type, (counts.get(parsed.type) ?? 0) + 1);
    last_event_id = parsed.id;
    last_logical_time = parsed.logicalTime;
  }

  return {
    total_count: total,
    counts_by_type: Object.fromEntries(counts.entries()),
    last_event_id,
    last_logical_time,
  };
}

