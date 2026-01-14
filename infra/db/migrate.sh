#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="/infra/db/migrations"
MIGRATIONS_TABLE="public.dreichor_schema_migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: Missing required env var: DATABASE_URL" >&2
  exit 1
fi

echo "dreichor-migrate: starting"
echo "dreichor-migrate: migrations_dir=${MIGRATIONS_DIR}"
echo "dreichor-migrate: migrations_table=${MIGRATIONS_TABLE}"

# Create tracking table if it does not exist (MUST NOT be part of a SQL migration file).
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL
);
SQL

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "ERROR: migrations dir not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

# Deterministic order: filename sorting.
mapfile -t files < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name "*.sql" -print | LC_ALL=C sort)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "dreichor-migrate: no *.sql migrations found (nothing to do)"
  exit 0
fi

for f in "${files[@]}"; do
  version="$(basename "${f}")"
  already_applied="$(
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -A -t -c \
      "SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE version = '$(printf "%s" "${version}" | sed "s/'/''/g")' LIMIT 1;"
  )"

  if [[ "${already_applied}" == "1" ]]; then
    echo "dreichor-migrate: skip (already applied): ${version}"
    continue
  fi

  echo "dreichor-migrate: apply: ${version}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${f}"

  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO ${MIGRATIONS_TABLE}(version, applied_at) VALUES ('$(printf "%s" "${version}" | sed "s/'/''/g")', now());"

  echo "dreichor-migrate: applied: ${version}"
done

echo "dreichor-migrate: complete"

