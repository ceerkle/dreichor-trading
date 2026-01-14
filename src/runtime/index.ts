import * as fs from "node:fs";
import * as net from "node:net";
import { URL } from "node:url";

import { initializeShadowLedgerState } from "../core/shadow_ledger.js";
import { MetaOrchestratorV1 } from "./meta/meta_orchestrator_v1.js";
import { startupPhase1ValidateEnvOrThrow } from "./startup/index.js";
import {
  FilesystemAuditEventStore,
  FilesystemSnapshotStore,
  replayDecisionMemoryFromStore,
  replayShadowLedgerFromLatestSnapshot
} from "./persistence/index.js";

const PAPER_RUNTIME_VERSION = "phase-1.5-paper-runtime@v1";

// Phase 1.5 mandatory mounts (file-based persistence)
const AUDIT_EVENTS_ROOT_DIR = "/var/lib/dreichor/audit-events";
const SNAPSHOTS_ROOT_DIR = "/var/lib/dreichor/snapshots";

function log(msg: string): void {
  console.log(msg);
}

function phase(name: string): void {
  log(`\n=== ${name} ===`);
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (v === undefined || v.trim().length === 0) {
    // Should be caught by env validation already; keep as defensive guard.
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

function assertExistingDir(dir: string, label: string): void {
  try {
    const st = fs.statSync(dir);
    if (!st.isDirectory()) throw new Error("not a directory");
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (e: any) {
    throw new Error(
      `Persistence mount not available (${label}): expected writable directory at '${dir}'. Underlying error: ${
        e?.message ?? String(e)
      }`
    );
  }
}

async function checkPostgresTcpConnectivityOrThrow(databaseUrl: string): Promise<void> {
  const u = new URL(databaseUrl);
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 5432;
  if (!host) throw new Error("DATABASE_URL missing hostname");
  if (!Number.isFinite(port) || port <= 0) throw new Error("DATABASE_URL has invalid port");

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    const timeoutMs = 3000;
    const t = setTimeout(() => {
      socket.destroy(new Error("timeout"));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(t);
      socket.end();
      resolve();
    });
    socket.once("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    socket.once("close", (hadError) => {
      clearTimeout(t);
      if (hadError) return;
      // If we reached close without error, connect either succeeded (resolved) or ended early; treat as ok.
    });
  }).catch((err: any) => {
    throw new Error(`Database connectivity check failed (tcp): ${err?.message ?? String(err)}`);
  });
}

async function main(): Promise<void> {
  phase("STARTUP 1/6 — banner");
  log(`dreichor runtime: ${PAPER_RUNTIME_VERSION}`);
  log(`node: ${process.version}`);

  phase("STARTUP 2/6 — environment validation");
  startupPhase1ValidateEnvOrThrow(process.env);

  // Paper-only enforcement (explicit, hard fail).
  const executionPlane = requireEnv("EXECUTION_PLANE");
  if (executionPlane !== "paper") {
    throw new Error(`LIVE execution is forbidden in Phase 1.5: EXECUTION_PLANE must be 'paper' (got '${executionPlane}')`);
  }

  phase("STARTUP 3/6 — persistence initialization");
  // Fail fast: volume mounts must exist; we must not create container-local persistence.
  assertExistingDir(AUDIT_EVENTS_ROOT_DIR, "audit-events");
  assertExistingDir(SNAPSHOTS_ROOT_DIR, "snapshots");

  const auditEventStore = new FilesystemAuditEventStore({ rootDir: AUDIT_EVENTS_ROOT_DIR });
  const snapshotStore = new FilesystemSnapshotStore({ rootDir: SNAPSHOTS_ROOT_DIR });

  // Persistence includes database availability; check connectivity after env validation.
  const databaseUrl = requireEnv("DATABASE_URL");
  await checkPostgresTcpConnectivityOrThrow(databaseUrl);
  log("persistence: database tcp connectivity OK");

  phase("STARTUP 4/6 — replay");
  const events = auditEventStore.readAll();
  log(`replay: loaded audit events: count=${events.length}`);

  const decisionMemory = replayDecisionMemoryFromStore(auditEventStore);
  log("replay: decision memory restored");

  const maybeLedger = replayShadowLedgerFromLatestSnapshot(snapshotStore);
  const shadowLedger = maybeLedger ?? initializeShadowLedgerState("PAPER");
  if (shadowLedger.plane !== "PAPER") {
    throw new Error(`ShadowLedgerState.plane must be PAPER in Phase 1.5 (got '${shadowLedger.plane}')`);
  }
  log(`replay: shadow ledger restored (${maybeLedger ? "from snapshot" : "empty"})`);

  phase("STARTUP 5/6 — meta orchestrator initialization");
  // No scheduling, no background work — just wiring.
  const meta = new MetaOrchestratorV1();
  void meta;
  log("meta: initialized");

  phase("STARTUP 6/6 — idle");
  log("READY");
  log(`persistence: audit-events-root=${AUDIT_EVENTS_ROOT_DIR}`);
  log(`persistence: snapshots-root=${SNAPSHOTS_ROOT_DIR}`);
  log("runtime: idle (waiting for SIGINT/SIGTERM)");

  const ac = new AbortController();
  const shutdown = (signal: string) => {
    log(`shutdown: received ${signal}`);
    ac.abort();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await new Promise<void>((resolve) => {
    if (ac.signal.aborted) return resolve();
    ac.signal.addEventListener("abort", () => resolve(), { once: true });
  });

  log("shutdown: complete");
}

process.on("unhandledRejection", (reason) => {
  console.error("FATAL: unhandledRejection", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("FATAL: uncaughtException", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("FATAL: startup failed", err);
  process.exit(1);
});

