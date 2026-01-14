# Database Migrations (Phase 1.5)
#
# Normative source: docs/infra/DB_MIGRATION_MODEL.md
#
# Location (authoritative for Phase 1.5):
# - infra/db/migrations/
#
# Rules:
# - Plain SQL files only (*.sql)
# - Filenames define order (lexicographic sort), strictly ordered and monotonic:
#   001_init.sql, 002_add_shadow_ledger.sql, ...
# - Migrations are executed manually by an operator via the one-shot
#   migration container (see infra/docker/Dockerfile.migrations)
#
# IMPORTANT:
# - The runtime MUST NOT auto-migrate.
# - The migration runner tracks applied versions in:
#   public.dreichor_schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL)

