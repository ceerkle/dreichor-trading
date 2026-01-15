import type { ObserveDerivedShadowLedgerResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObserveDerivedShadowLedgerHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function derivedShadowLedger(
  _req: ObserveDerivedShadowLedgerHttpRequestV1,
): ObserveDerivedShadowLedgerResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/derived/shadow-ledger is not implemented.");
}

