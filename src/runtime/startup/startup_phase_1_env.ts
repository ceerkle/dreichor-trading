import type { ProcessEnv } from "./types.js";
import { validateRuntimeEnvV1OrThrow } from "./env_validation.js";

/**
 * Startup Phase 1 — Environment Validation (Phase 1.5)
 *
 * Must run before any side effects (DB connect, replay, etc.).
 * No defaults are applied.
 */
export function startupPhase1ValidateEnvOrThrow(env: ProcessEnv): void {
  validateRuntimeEnvV1OrThrow(env);
}

