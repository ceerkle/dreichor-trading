export const ENV_SCHEMA_V1 = Object.freeze({
  required: Object.freeze({
    NODE_ENV: Object.freeze(["production", "staging", "development"] as const),
    RUNTIME_INSTANCE_ID: "uuid" as const,
    LOGICAL_TIME_SOURCE: Object.freeze(["marketdata", "manual"] as const),

    DATABASE_URL: "postgres_url" as const,
    PERSISTENCE_MODE: Object.freeze(["postgres"] as const),
    SNAPSHOT_STRATEGY: Object.freeze(["on-ledger-update", "manual"] as const),

    EXECUTION_PLANE: Object.freeze(["paper", "live"] as const),
    EXCHANGE_PROVIDER: Object.freeze(["binance"] as const),

    SAFETY_MODE: Object.freeze(["normal", "halt", "flatten"] as const),

    LOG_LEVEL: Object.freeze(["debug", "info", "warn", "error"] as const),
    ENABLE_AUDIT_LOGGING: "boolean_string" as const
  }),

  conditional: Object.freeze({
    // If EXECUTION_PLANE=live: credentials are required.
    // If EXECUTION_PLANE=paper: credentials MUST be absent.
    BINANCE_API_KEY: "binance_credential" as const,
    BINANCE_API_SECRET: "binance_credential" as const
  })
});

export type EnvSchemaV1 = typeof ENV_SCHEMA_V1;

