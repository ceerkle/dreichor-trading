import type { ObservePersistenceAuditEventsSummaryResponseV1 } from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistenceAuditEventsSummaryHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

export function auditSummary(
  _req: ObservePersistenceAuditEventsSummaryHttpRequestV1,
): ObservePersistenceAuditEventsSummaryResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/persistence/audit-events/summary is not implemented.");
}

