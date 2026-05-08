# Alembic migrations

Alembic is the only supported schema migration entrypoint for the backend.

- New databases: run `alembic upgrade head` from `backend/`.
- Existing server databases that match the pre-Alembic server dump must be
  backed up and verified against `0001_initial_schema`, then migrated with
  `alembic upgrade head`. The baseline uses `CREATE TABLE IF NOT EXISTS`, so
  it records the initial Alembic revision without rebuilding existing tables,
  and the next revision applies the MinIO storage changes.
- Existing local databases that already have the MinIO schema can be marked with
  `alembic stamp --purge head` after verification.
- Legacy migration helpers were moved to `backend/migrations/legacy/` and are retained only for audit/reference.

Docker startup now runs `alembic upgrade head`; destructive data bootstrap scripts must not run automatically.
