import * as fs from "node:fs";

import type { ObservePathInspectionV1, ObservePersistencePathsResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistencePathsHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

interface PersistencePathsDeps {
  auditEventsPath: string;
  snapshotsPath: string;
  statSync: typeof fs.statSync;
}

const DEFAULT_DEPS: PersistencePathsDeps = {
  auditEventsPath: "/var/lib/dreichor/audit-events",
  snapshotsPath: "/var/lib/dreichor/snapshots",
  statSync: fs.statSync,
};

function inspectPathOrThrow(path: string, deps: PersistencePathsDeps): ObservePathInspectionV1 {
  try {
    const st = deps.statSync(path);
    return { path, exists: true, size_bytes: st.size };
  } catch (err: any) {
    const code = err?.code;
    if (code === "ENOENT") return { path, exists: false, size_bytes: null };
    throw new ObserverError("INTERNAL_ERROR", `Filesystem stat failed for '${path}': ${err?.message ?? String(err)}`);
  }
}

export function persistencePaths(
  _req: ObservePersistencePathsHttpRequestV1,
  deps: PersistencePathsDeps = DEFAULT_DEPS,
): ObservePersistencePathsResponseV1 {
  const audit_events = inspectPathOrThrow(deps.auditEventsPath, deps);
  const snapshots = inspectPathOrThrow(deps.snapshotsPath, deps);
  return { audit_events, snapshots };
}

