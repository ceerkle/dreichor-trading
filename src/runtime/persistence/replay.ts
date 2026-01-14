import type { AuditEvent, AuditSnapshot, ShadowLedgerSnapshot } from "../../core/audit_persistence.js";
import {
  initializeDecisionMemoryStateV1,
  reduceDecisionMemoryV1,
  type DecisionMemoryState
} from "../../core/decision_memory.js";
import type { ShadowLedgerState } from "../../core/shadow_ledger.js";
import type { AuditEventStore, SnapshotStore } from "./ports.js";

/**
 * Replay Decision Memory exclusively from AuditEvents (v1).
 *
 * Rules:
 * - readAll() order is authoritative
 * - no sorting
 * - deterministic reduction via Core reducer
 */
export function replayDecisionMemoryFromAuditEvents(events: readonly AuditEvent[]): DecisionMemoryState {
  let state = initializeDecisionMemoryStateV1();
  for (const e of events) {
    state = reduceDecisionMemoryV1(state, e);
  }
  return state;
}

export function replayDecisionMemoryFromStore(store: AuditEventStore): DecisionMemoryState {
  return replayDecisionMemoryFromAuditEvents(store.readAll());
}

/**
 * Replay Shadow Ledger exclusively from ShadowLedgerSnapshot (v1).
 *
 * Normative clarification:
 * - MUST NOT be derived from AuditEvents in v1.
 */
export function replayShadowLedgerFromLatestSnapshot(
  snapshotStore: SnapshotStore
): ShadowLedgerState | undefined {
  const latest = snapshotStore.readLatest();
  if (!latest) return undefined;
  if (latest.type !== "SHADOW_LEDGER_SNAPSHOT") {
    throw new Error("Latest snapshot is not a ShadowLedgerSnapshot");
  }
  return shadowLedgerStateFromSnapshot(latest);
}

export function shadowLedgerStateFromSnapshot(snapshot: ShadowLedgerSnapshot): ShadowLedgerState {
  return Object.freeze({
    plane: snapshot.plane,
    positions: snapshot.positions
  });
}

export function assertShadowLedgerSnapshot(snapshot: AuditSnapshot): ShadowLedgerSnapshot {
  if (snapshot.type !== "SHADOW_LEDGER_SNAPSHOT") {
    throw new Error("Snapshot is not a ShadowLedgerSnapshot");
  }
  return snapshot;
}

