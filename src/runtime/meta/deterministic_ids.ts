import type { UUID } from "../../core/value_objects.js";
import { createUuid } from "../../core/value_objects.js";

/**
 * Deterministische UUID-ableitungen für Meta-Layer (v1).
 *
 * Hinweis: Core v1 definiert keine generische Audit-ID-Derivation.
 * Meta muss IDs deterministisch erzeugen, ohne Randomness/Wallclock.
 *
 * Wir verwenden denselben FNV-1a-64 Ansatz wie in Core (Steps 5/6/10),
 * und formatieren 32 hex chars als UUID-String.
 */
export function deriveUuidV1(namespace: string, payload: string): UUID {
  const input = `${namespace}|${payload}`;
  const h1 = fnv1a64(input);
  const h2 = fnv1a64(`salt:meta-v1|${input}`);
  const hex = `${toHex64(h1)}${toHex64(h2)}`; // 32 hex chars
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
  return createUuid(uuid);
}

// ---- Deterministic hashing helpers (no I/O, no randomness) ----

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const MASK_64 = (1n << 64n) - 1n;

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash;
}

function toHex64(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

