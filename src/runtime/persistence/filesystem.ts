import * as fs from "node:fs";
import * as path from "node:path";

import type { AuditEvent, AuditSnapshot } from "../../core/audit_persistence.js";
import type { AuditEventStore, SnapshotStore } from "./ports.js";

type FilesystemStoreOptions = Readonly<{
  /**
   * Root directory that contains the mandatory `data/` directory.
   * Defaults to process.cwd().
   */
  rootDir?: string;
}>;

function ensureDirExists(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function appendNdjsonLine(filePath: string, value: unknown): void {
  const line = `${JSON.stringify(value)}\n`;
  fs.appendFileSync(filePath, line, { encoding: "utf8" });
}

function readNdjsonFile(filePath: string): unknown[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.trim().length === 0) return [];
  const lines = raw.split("\n").filter((l) => l.length > 0);
  return lines.map((l) => JSON.parse(l));
}

export class FilesystemAuditEventStore implements AuditEventStore {
  readonly #filePath: string;

  constructor(options: FilesystemStoreOptions = {}) {
    const rootDir = options.rootDir ?? process.cwd();
    const dataDir = path.join(rootDir, "data");
    ensureDirExists(dataDir);
    this.#filePath = path.join(dataDir, "audit_events.ndjson");
  }

  append(event: AuditEvent): void {
    // Append-only; any IO error throws (fail-fast).
    appendNdjsonLine(this.#filePath, event);
  }

  readAll(): readonly AuditEvent[] {
    // Authoritative order is file order; do not sort.
    return readNdjsonFile(this.#filePath) as AuditEvent[];
  }
}

export class FilesystemSnapshotStore implements SnapshotStore {
  readonly #filePath: string;

  constructor(options: FilesystemStoreOptions = {}) {
    const rootDir = options.rootDir ?? process.cwd();
    const dataDir = path.join(rootDir, "data");
    ensureDirExists(dataDir);
    this.#filePath = path.join(dataDir, "snapshots.ndjson");
  }

  write(snapshot: AuditSnapshot): void {
    // Append-only; any IO error throws (fail-fast).
    appendNdjsonLine(this.#filePath, snapshot);
  }

  readLatest(): AuditSnapshot | undefined {
    const all = readNdjsonFile(this.#filePath) as AuditSnapshot[];
    if (all.length === 0) return undefined;
    return all[all.length - 1];
  }
}

export function dataDirForRoot(rootDir: string): string {
  return path.join(rootDir, "data");
}

export function auditEventsPathForRoot(rootDir: string): string {
  return path.join(dataDirForRoot(rootDir), "audit_events.ndjson");
}

export function snapshotsPathForRoot(rootDir: string): string {
  return path.join(dataDirForRoot(rootDir), "snapshots.ndjson");
}

