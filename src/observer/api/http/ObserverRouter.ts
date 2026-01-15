import { cfAccessGuard } from "./middleware/cfAccessGuard.js";
import { ObserverError } from "../../errors/ObserverError.js";
import { runtimeStatus } from "./handlers/runtimeStatus.js";
import { persistencePaths } from "./handlers/persistencePaths.js";
import { auditEvents } from "./handlers/auditEvents.js";
import { auditSummary } from "./handlers/auditSummary.js";
import { latestSnapshot } from "./handlers/latestSnapshot.js";
import { derivedDecisionMemory } from "./handlers/derivedDecisionMemory.js";
import { derivedShadowLedger } from "./handlers/derivedShadowLedger.js";

export type ObserverHttpMethod = "GET";

export interface ObserverHttpRequest {
  method: ObserverHttpMethod;
  path: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
}

export type ObserverHandler = (req: ObserverHttpRequest) => unknown | Promise<unknown>;
export type ObserverMiddleware = (req: ObserverHttpRequest) => void | Promise<void>;

export interface ObserverRoute {
  method: ObserverHttpMethod;
  path: string;
  handler: ObserverHandler;
}

export class ObserverRouter {
  public readonly basePath = "/v1/observe";
  private readonly routes: ObserverRoute[] = [];
  private readonly middlewares: ObserverMiddleware[] = [];

  public constructor() {
    this.middlewares.push((req) => cfAccessGuard(req));
    this.registerV1Routes();
  }

  public listRoutes(): readonly ObserverRoute[] {
    return this.routes;
  }

  public async handle(req: ObserverHttpRequest): Promise<unknown> {
    const route = this.routes.find((r) => r.method === req.method && r.path === req.path);
    if (!route) {
      throw new ObserverError("NOT_FOUND", `No route registered for ${req.method} ${req.path}.`);
    }

    for (const mw of this.middlewares) await mw(req);
    return await route.handler(req);
  }

  private get(path: string, handler: ObserverHandler): void {
    if (!path.startsWith("/")) {
      throw new ObserverError("NOT_FOUND", "Internal router misconfiguration: path must start with '/'.");
    }
    this.routes.push({ method: "GET", path: `${this.basePath}${path}`, handler });
  }

  private registerV1Routes(): void {
    this.get("/runtime/status", runtimeStatus as unknown as ObserverHandler);
    this.get("/persistence/paths", persistencePaths as unknown as ObserverHandler);
    this.get("/persistence/audit-events", auditEvents as unknown as ObserverHandler);
    this.get("/persistence/audit-events/summary", auditSummary as unknown as ObserverHandler);
    this.get("/persistence/snapshots/latest", latestSnapshot as unknown as ObserverHandler);
    this.get("/derived/decision-memory", derivedDecisionMemory as unknown as ObserverHandler);
    this.get("/derived/shadow-ledger", derivedShadowLedger as unknown as ObserverHandler);
  }
}

