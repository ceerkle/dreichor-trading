import { ObserverError } from "../../../errors/ObserverError.js";

export interface CfAccessGuardRequest {
  headers: Record<string, string | undefined>;
}

function headerPresent(headers: Record<string, string | undefined>, name: string): boolean {
  const direct = headers[name];
  if (typeof direct === "string" && direct.length > 0) return true;

  const lower = headers[name.toLowerCase()];
  return typeof lower === "string" && lower.length > 0;
}

export function cfAccessGuard(req: CfAccessGuardRequest): void {
  const hasClientId = headerPresent(req.headers, "CF-Access-Client-Id");
  const hasClientSecret = headerPresent(req.headers, "CF-Access-Client-Secret");

  if (!hasClientId || !hasClientSecret) {
    throw new ObserverError("UNAUTHORIZED", "Missing required CF Access headers.");
  }
}

