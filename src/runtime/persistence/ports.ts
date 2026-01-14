import type { AuditEvent, AuditSnapshot } from "../../core/audit_persistence.js";

/**
 * Step 11 — Persistence Runtime (v1-final)
 *
 * Ports are intentionally minimal and fail-fast.
 * No IO is modeled here; implementations may do IO.
 */

export interface AuditEventStore {
  /**
   * Append-only.
   * Order is call order.
   * Any error MUST throw (fail-fast).
   */
  append(event: AuditEvent): void;

  /**
   * Returns all events in authoritative order.
   * Any error MUST throw (fail-fast).
   */
  readAll(): readonly AuditEvent[];
}

export interface SnapshotStore {
  /**
   * Append-only (no overwrite).
   * Any error MUST throw (fail-fast).
   */
  write(snapshot: AuditSnapshot): void;

  /**
   * Returns the latest snapshot if any exist.
   * Any error MUST throw (fail-fast).
   */
  readLatest(): AuditSnapshot | undefined;
}

