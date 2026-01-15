import type { ObservePersistenceSnapshotsLatestResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistenceSnapshotsLatestHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function latestSnapshot(
  _req: ObservePersistenceSnapshotsLatestHttpRequestV1,
): ObservePersistenceSnapshotsLatestResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/persistence/snapshots/latest is not implemented.");
}

