# Alembic migrations

Alembic is the only supported schema migration entrypoint for the backend.

- New databases: run `alembic upgrade head` from `backend/`.
- Existing databases that were created before Alembic must be backed up, verified
  against the current model, and then marked with `alembic stamp head`. Do not run
  the initial schema migration against a database that already has application
  tables.
- Legacy migration helpers were moved to `backend/migrations/legacy/` and are retained only for audit/reference.

Docker startup now runs `alembic upgrade head`; destructive data bootstrap scripts must not run automatically.
