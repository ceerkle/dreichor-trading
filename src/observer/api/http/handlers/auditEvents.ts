import type {
  ObservePersistenceAuditEventsRequestV1,
  ObservePersistenceAuditEventsResponseV1,
} from "../../contracts/v1/observe.contract.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObservePersistenceAuditEventsHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: ObservePersistenceAuditEventsRequestV1;
}

export function auditEvents(_req: ObservePersistenceAuditEventsHttpRequestV1): ObservePersistenceAuditEventsResponseV1 {
  throw new ObserverError("NOT_IMPLEMENTED", "GET /v1/observe/persistence/audit-events is not implemented.");
}

