import { ENV_SCHEMA_V1 } from "./env_schema_v1.js";
import type { ProcessEnv } from "./types.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBlank(v: string | undefined): boolean {
  return v === undefined || v.trim().length === 0;
}

function requirePresent(env: ProcessEnv, key: string, errors: string[]) {
  const v = env[key];
  if (isBlank(v)) errors.push(`Missing required env var: ${key}`);
  return v;
}

function requireOneOf(
  env: ProcessEnv,
  key: string,
  allowed: readonly string[],
  errors: string[]
) {
  const v = requirePresent(env, key, errors);
  if (v === undefined) return v;
  if (!allowed.includes(v)) {
    errors.push(`Invalid value for ${key}: '${v}' (allowed: ${allowed.join(" | ")})`);
  }
  return v;
}

function requireUuid(env: ProcessEnv, key: string, errors: string[]) {
  const v = requirePresent(env, key, errors);
  if (v === undefined) return v;
  if (!UUID_RE.test(v)) {
    errors.push(`Invalid value for ${key}: '${v}' (expected uuid)`);
  }
  return v;
}

function requireBooleanString(env: ProcessEnv, key: string, errors: string[]) {
  const v = requirePresent(env, key, errors);
  if (v === undefined) return v;
  if (v !== "true" && v !== "false") {
    errors.push(`Invalid value for ${key}: '${v}' (allowed: true | false)`);
  }
  return v;
}

function requirePostgresUrl(env: ProcessEnv, key: string, errors: string[]) {
  const v = requirePresent(env, key, errors);
  if (v === undefined) return v;
  if (!v.startsWith("postgres://")) {
    errors.push(`Invalid value for ${key}: expected to start with 'postgres://'`);
  }
  return v;
}

/**
 * Phase 1.5 — strict runtime env validation (startup Phase 1).
 *
 * Scope (Option B):
 * - Validate variables explicitly listed in the schema.
 * - Reject unknown DREICHOR_* variables that are not in the schema.
 * - Ignore all other non-DREICHOR variables (PATH, HOSTNAME, etc.).
 *
 * No defaults are applied.
 */
export function validateRuntimeEnvV1OrThrow(env: ProcessEnv): void {
  const errors: string[] = [];

  // Unknown DREICHOR_* variables are forbidden unless explicitly in schema.
  const allowedKeys = new Set<string>([
    ...Object.keys(ENV_SCHEMA_V1.required),
    ...Object.keys(ENV_SCHEMA_V1.conditional)
  ]);
  for (const k of Object.keys(env)) {
    if (!k.startsWith("DREICHOR_")) continue;
    if (!allowedKeys.has(k)) errors.push(`Unknown DREICHOR_* env var: ${k}`);
  }

  // ---- Required schema vars ----
  requireOneOf(env, "NODE_ENV", ENV_SCHEMA_V1.required.NODE_ENV, errors);
  requireUuid(env, "RUNTIME_INSTANCE_ID", errors);
  requireOneOf(env, "LOGICAL_TIME_SOURCE", ENV_SCHEMA_V1.required.LOGICAL_TIME_SOURCE, errors);

  requirePostgresUrl(env, "DATABASE_URL", errors);
  requireOneOf(env, "PERSISTENCE_MODE", ENV_SCHEMA_V1.required.PERSISTENCE_MODE, errors);
  requireOneOf(env, "SNAPSHOT_STRATEGY", ENV_SCHEMA_V1.required.SNAPSHOT_STRATEGY, errors);

  const executionPlane = requireOneOf(
    env,
    "EXECUTION_PLANE",
    ENV_SCHEMA_V1.required.EXECUTION_PLANE,
    errors
  );
  requireOneOf(env, "EXCHANGE_PROVIDER", ENV_SCHEMA_V1.required.EXCHANGE_PROVIDER, errors);

  requireOneOf(env, "SAFETY_MODE", ENV_SCHEMA_V1.required.SAFETY_MODE, errors);
  requireOneOf(env, "LOG_LEVEL", ENV_SCHEMA_V1.required.LOG_LEVEL, errors);
  requireBooleanString(env, "ENABLE_AUDIT_LOGGING", errors);

  // ---- Conditional vars ----
  const apiKey = env.BINANCE_API_KEY;
  const apiSecret = env.BINANCE_API_SECRET;
  if (executionPlane === "live") {
    if (isBlank(apiKey)) errors.push("Missing required env var: BINANCE_API_KEY (required when EXECUTION_PLANE=live)");
    if (isBlank(apiSecret))
      errors.push("Missing required env var: BINANCE_API_SECRET (required when EXECUTION_PLANE=live)");
  }
  if (executionPlane === "paper") {
    if (!isBlank(apiKey)) errors.push("Forbidden env var in paper mode: BINANCE_API_KEY (must be absent when EXECUTION_PLANE=paper)");
    if (!isBlank(apiSecret))
      errors.push("Forbidden env var in paper mode: BINANCE_API_SECRET (must be absent when EXECUTION_PLANE=paper)");
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
  }
}

