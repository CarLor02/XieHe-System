# Alembic migrations

Alembic is the only supported schema migration entrypoint for the backend.

- New databases: run `alembic upgrade head` from `backend/`.
- Existing databases created by the previous SQL/init scripts: back up the database, then run `alembic upgrade head`; the bootstrap revision detects the existing tables and migrates them in place.
- Legacy migration helpers were moved to `backend/migrations/legacy/` and are retained only for audit/reference.

Docker startup now runs `alembic upgrade head`; destructive data bootstrap scripts must not run automatically.
