# Storage migration utilities

Runtime schema changes are managed by Alembic in `backend/alembic/`.

The scripts under `legacy/` are deprecated historical helpers. Do not run them for new deployments.

`migrate_local_files_to_minio.py` is a one-time operational script for copying the old local `uploads/completed/` files into MinIO after the Alembic schema migration has added `storage_bucket` and `object_key`.
