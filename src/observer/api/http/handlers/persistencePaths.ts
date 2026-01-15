import type { ObservePersistencePathsResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistencePathsHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function persistencePaths(_req: ObservePersistencePathsHttpRequestV1): ObservePersistencePathsResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/persistence/paths is not implemented.");
}

