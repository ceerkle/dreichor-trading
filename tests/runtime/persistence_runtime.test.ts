import { describe, expect, it } from "vitest";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  createLogicalTime,
  createUuid,
  type AuditEvent,
  type ShadowLedgerSnapshot
} from "../../src/core/index.js";

import {
  FilesystemAuditEventStore,
  FilesystemSnapshotStore,
  InMemoryAuditEventStore,
  InMemorySnapshotStore,
  auditEventsPathForRoot,
  replayDecisionMemoryFromStore,
  replayShadowLedgerFromLatestSnapshot,
  snapshotsPathForRoot
} from "../../src/runtime/persistence/index.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dreichor-step11-"));
}

function readLines(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split("\n").filter((l) => l.length > 0);
}

function makeValidDecisionMemoryEventSequence(): AuditEvent[] {
  const decisionId = createUuid("00000000-0000-0000-0000-00000000d001");
  const execId = createUuid("00000000-0000-0000-0000-00000000d002");

  const e1: AuditEvent = {
    id: createUuid("00000000-0000-0000-0000-00000000d010"),
    type: "DECISION_EVALUATED",
    version: 1,
    logicalTime: createLogicalTime(1),
    createdAtLogical: createLogicalTime(1),
    decisionId,
    strategyInstanceId: createUuid("00000000-0000-0000-0000-00000000d011"),
    decisionClass: "memory.contract.test@v1" as any
  };

  const e2: AuditEvent = {
    id: createUuid("00000000-0000-0000-0000-00000000d020"),
    type: "SAFETY_EVALUATED",
    version: 1,
    logicalTime: createLogicalTime(2),
    createdAtLogical: createLogicalTime(2),
    decisionId,
    result: { type: "ALLOW" }
  };

  const e3: AuditEvent = {
    id: createUuid("00000000-0000-0000-0000-00000000d030"),
    type: "EXECUTION_OUTCOME_RECORDED",
    version: 1,
    logicalTime: createLogicalTime(3),
    createdAtLogical: createLogicalTime(3),
    decisionId,
    executionId: execId,
    status: "FILLED"
  };

  return [e1, e2, e3];
}

function makeShadowLedgerSnapshot(): ShadowLedgerSnapshot {
  return {
    snapshotId: createUuid("00000000-0000-0000-0000-00000000c001"),
    type: "SHADOW_LEDGER_SNAPSHOT",
    version: 1,
    logicalTime: createLogicalTime(10),
    plane: "PAPER",
    positions: {
      ["BTC-USD" as any]: {
        marketId: "BTC-USD" as any,
        quantity: "1.0" as any,
        isOpen: true,
        lastExecutionId: createUuid("00000000-0000-0000-0000-00000000e999")
      }
    }
  };
}

describe("Step 11 — Persistence Runtime (v1-final)", () => {
  it("InMemory: append/readAll roundtrip + snapshot readLatest", () => {
    const events = makeValidDecisionMemoryEventSequence();
    const eventStore = new InMemoryAuditEventStore();
    for (const e of events) eventStore.append(e);
    expect(eventStore.readAll()).toEqual(events);

    const snapshotStore = new InMemorySnapshotStore();
    expect(snapshotStore.readLatest()).toBeUndefined();
    const snap = makeShadowLedgerSnapshot();
    snapshotStore.write(snap);
    expect(snapshotStore.readLatest()).toEqual(snap);
  });

  it("InMemory: replay is deterministic (DecisionMemory from AuditEvents; ShadowLedger from snapshot)", () => {
    const events = makeValidDecisionMemoryEventSequence();
    const snap = makeShadowLedgerSnapshot();

    const eventStore = new InMemoryAuditEventStore();
    for (const e of events) eventStore.append(e);

    const snapshotStore = new InMemorySnapshotStore();
    snapshotStore.write(snap);

    const dm1 = replayDecisionMemoryFromStore(eventStore);
    const dm2 = replayDecisionMemoryFromStore(eventStore);
    expect(dm1).toEqual(dm2);

    const ledger = replayShadowLedgerFromLatestSnapshot(snapshotStore);
    expect(ledger).toEqual({ plane: "PAPER", positions: snap.positions });
  });

  it("Filesystem: NDJSON write/read, one JSON object per line, events match exactly", () => {
    const root = tmpRoot();
    const eventStore = new FilesystemAuditEventStore({ rootDir: root });

    const events = makeValidDecisionMemoryEventSequence();
    for (const e of events) eventStore.append(e);

    const readBack = eventStore.readAll();
    expect(readBack).toEqual(events);

    const p = auditEventsPathForRoot(root);
    const lines = readLines(p);
    expect(lines.length).toBe(events.length);
    for (let i = 0; i < events.length; i++) {
      // Minimal storage: persisted event matches in-memory event exactly (no extra fields).
      expect(lines[i]).toBe(JSON.stringify(events[i]));
      expect(JSON.parse(lines[i])).toEqual(events[i]);
    }
  });

  it("Filesystem: snapshot write/readLatest, and ShadowLedger replay uses snapshot only", () => {
    const root = tmpRoot();
    const snapshotStore = new FilesystemSnapshotStore({ rootDir: root });

    expect(snapshotStore.readLatest()).toBeUndefined();
    const snap = makeShadowLedgerSnapshot();
    snapshotStore.write(snap);

    const latest = snapshotStore.readLatest();
    expect(latest).toEqual(snap);

    const ledger = replayShadowLedgerFromLatestSnapshot(snapshotStore);
    expect(ledger).toEqual({ plane: snap.plane, positions: snap.positions });

    const p = snapshotsPathForRoot(root);
    const lines = readLines(p);
    expect(lines.length).toBe(1);
    // Minimal storage: snapshot is persisted exactly (no extra fields).
    expect(lines[0]).toBe(JSON.stringify(snap));
  });

  it("Filesystem: replay result equals InMemory replay (DecisionMemory) for same AuditEvent sequence", () => {
    const events = makeValidDecisionMemoryEventSequence();

    const memStore = new InMemoryAuditEventStore();
    for (const e of events) memStore.append(e);
    const dmMem = replayDecisionMemoryFromStore(memStore);

    const root = tmpRoot();
    const fsStore = new FilesystemAuditEventStore({ rootDir: root });
    for (const e of events) fsStore.append(e);
    const dmFs = replayDecisionMemoryFromStore(fsStore);

    expect(dmFs).toEqual(dmMem);
  });
});

