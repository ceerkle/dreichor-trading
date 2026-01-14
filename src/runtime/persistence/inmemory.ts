import type { AuditEvent, AuditSnapshot } from "../../core/audit_persistence.js";
import type { AuditEventStore, SnapshotStore } from "./ports.js";

export class InMemoryAuditEventStore implements AuditEventStore {
  #events: ReadonlyArray<AuditEvent> = Object.freeze([]);

  append(event: AuditEvent): void {
    // Append-only, deterministic order.
    this.#events = Object.freeze([...this.#events, event]);
  }

  readAll(): readonly AuditEvent[] {
    return this.#events;
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  #snapshots: ReadonlyArray<AuditSnapshot> = Object.freeze([]);

  write(snapshot: AuditSnapshot): void {
    // Append-only, deterministic order.
    this.#snapshots = Object.freeze([...this.#snapshots, snapshot]);
  }

  readLatest(): AuditSnapshot | undefined {
    return this.#snapshots.length === 0 ? undefined : this.#snapshots[this.#snapshots.length - 1];
  }
}

