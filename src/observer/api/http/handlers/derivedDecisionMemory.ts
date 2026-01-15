import type { ObserveDerivedDecisionMemoryResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObserveDerivedDecisionMemoryHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function derivedDecisionMemory(
  _req: ObserveDerivedDecisionMemoryHttpRequestV1,
): ObserveDerivedDecisionMemoryResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/derived/decision-memory is not implemented.");
}

