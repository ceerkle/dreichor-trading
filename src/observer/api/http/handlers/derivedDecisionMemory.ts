import type { ObserveDerivedDecisionMemoryResponseV1 } from "../../contracts/v1/observe.contract.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

import {
  initializeDecisionMemoryStateV1,
  reduceDecisionMemoryV1,
  type DecisionMemoryState,
} from "../../../../core/decision_memory.js";
import type { UserFeedbackRecord } from "../../../../core/user_feedback.js";
import { ObserverError } from "../../../errors/ObserverError.js";

export interface ObserveDerivedDecisionMemoryHttpRequestV1 {
  headers: Record<string, string | undefined>;
  query: Record<string, never>;
}

interface DerivedDecisionMemoryDeps {
  auditEventsRootDir: string;
  existsSync: typeof fs.existsSync;
  createReadStream: typeof fs.createReadStream;
}

const DEFAULT_DEPS: DerivedDecisionMemoryDeps = {
  auditEventsRootDir: "/var/lib/dreichor/audit-events",
  existsSync: fs.existsSync,
  createReadStream: fs.createReadStream,
};

function auditEventsNdjsonPathForRoot(rootDir: string): string {
  return path.join(rootDir, "data", "audit_events.ndjson");
}

type UserFeedbackRecordedAuditEventShape = {
  id: unknown;
  category: unknown;
  target: unknown;
  logicalTime: unknown;
  type: "USER_FEEDBACK_RECORDED";
};

function toUserFeedbackRecordOrThrow(e: UserFeedbackRecordedAuditEventShape): UserFeedbackRecord {
  if (typeof e.id !== "string") throw new Error("User feedback audit event is missing a string 'id'");
  if (typeof e.logicalTime !== "string")
    throw new Error("User feedback audit event is missing a string 'logicalTime'");
  if (e.category !== "DECISION_QUALITY" && e.category !== "RISK_COMFORT" && e.category !== "SYSTEM_BEHAVIOR") {
    throw new Error("User feedback audit event has invalid 'category'");
  }
  if (typeof e.target !== "object" || e.target === null) {
    throw new Error("User feedback audit event has invalid 'target'");
  }

  return Object.freeze({
    id: e.id as any,
    version: 1,
    category: e.category as any,
    target: e.target as any,
    logicalTime: e.logicalTime as any,
  });
}

function toV1(state: DecisionMemoryState): ObserveDerivedDecisionMemoryResponseV1 {
  const entries = state.entries as Record<string, any>;
  const outEntries: Record<string, any> = {};

  for (const [decisionId, entry] of Object.entries(entries)) {
    outEntries[decisionId] = {
      decisionId: entry.decisionId,
      decisionClass: entry.decisionClass,
      firstSeenLogicalTime: entry.firstSeenLogicalTime,
      execution: {
        executionsObserved: entry.execution.executionsObserved,
        filledCount: entry.execution.filledCount,
        failedCount: entry.execution.failedCount,
        lastExecutionStatus: entry.execution.lastExecutionStatus ?? null,
      },
      safety: {
        evaluationsObserved: entry.safety.evaluationsObserved,
        blockedCount: entry.safety.blockedCount,
        forcedSellCount: entry.safety.forcedSellCount,
        lastSafetyResult: entry.safety.lastSafetyResult ?? null,
      },
      feedback: {
        feedbackCount: entry.feedback.feedbackCount,
        categories: entry.feedback.categories,
      },
    };
  }

  return {
    decision_memory: {
      version: 1,
      entries: outEntries,
      seenInputIds: state.seenInputIds as any,
    },
  };
}

export async function derivedDecisionMemory(
  _req: ObserveDerivedDecisionMemoryHttpRequestV1,
  deps: DerivedDecisionMemoryDeps = DEFAULT_DEPS,
): Promise<ObserveDerivedDecisionMemoryResponseV1> {
  const filePath = auditEventsNdjsonPathForRoot(deps.auditEventsRootDir);

  let exists: boolean;
  try {
    exists = deps.existsSync(filePath);
  } catch (err: any) {
    throw new ObserverError(
      "INTERNAL_ERROR",
      `Filesystem exists check failed for '${filePath}': ${err?.message ?? String(err)}`,
    );
  }

  let state = initializeDecisionMemoryStateV1();
  if (!exists) return toV1(state);

  const input = deps.createReadStream(filePath, { encoding: "utf8" });
  let ioError: unknown = null;
  input.once("error", (err) => {
    ioError = err;
  });

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      if (line.length === 0) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch (err: any) {
        throw new ObserverError("INTERNAL_ERROR", `JSON parse failed for '${filePath}': ${err?.message ?? String(err)}`);
      }

      try {
        if (parsed?.type === "USER_FEEDBACK_RECORDED") {
          state = reduceDecisionMemoryV1(state, toUserFeedbackRecordOrThrow(parsed as UserFeedbackRecordedAuditEventShape));
        } else {
          state = reduceDecisionMemoryV1(state, parsed);
        }
      } catch (err: any) {
        throw new ObserverError(
          "INTERNAL_ERROR",
          `DecisionMemory reducer failed for input from '${filePath}': ${err?.message ?? String(err)}`,
        );
      }
    }
  } finally {
    rl.close();
  }

  if (ioError) {
    const e: any = ioError;
    throw new ObserverError("INTERNAL_ERROR", `Filesystem read failed for '${filePath}': ${e?.message ?? String(e)}`);
  }

  return toV1(state);
}

