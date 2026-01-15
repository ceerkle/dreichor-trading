import type { ObserveRuntimeStatusResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObserveRuntimeStatusHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function runtimeStatus(_req: ObserveRuntimeStatusHttpRequestV1): ObserveRuntimeStatusResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/runtime/status is not implemented.");
}

