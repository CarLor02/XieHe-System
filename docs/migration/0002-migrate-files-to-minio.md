# 0002: 迁移影像文件到 MinIO

## 1. 先进入维护窗口
停止用户上传/访问影像，避免 DB 已切 MinIO 但对象还没迁过去时出现下载失败。

执行本文件前，服务器数据库应已经按 `0001-use-alembic.md` 标记为
`0001_initial_schema`。不要跳过 0001 的 `stamp` 步骤。

## 2. 找到旧 uploads volume
```shell
docker volume ls --format '{{.Name}}' | grep uploads
```

如果和本地一致：
```shell
export UPLOADS_VOLUME=xiehe-system_uploads_data
```
如果服务器项目名不同，就替换成实际查到的 volume 名。

## 3. 备份数据库和旧 uploads volume
```shell
export BACKUP_ROOT=/srv/xiehe-backups/minio-migration-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"
docker exec medical_mysql sh -c \
    'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers medical_imaging_system' \
    > "$BACKUP_ROOT/medical_imaging_system.sql"
export UPLOADS_MOUNTPOINT=$(docker volume inspect -f '{{ .Mountpoint }}' "$UPLOADS_VOLUME")
tar -C "$UPLOADS_MOUNTPOINT" -czf "$BACKUP_ROOT/uploads_data.full.tgz" .
```

## 4. 从 0001 升级到 MinIO schema revision

这时服务器还不是 `0002_minio_storage`，而是刚被标记到
`0001_initial_schema`。先确认当前 revision：

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    current
```

期望输出包含：

```text
0001_initial_schema
```

然后执行 schema 迁移到 `0002_minio_storage`。这里不要使用 `upgrade head`，避免在后续
新增 revision 后跳过 MinIO 文件迁移的阶段边界：

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    upgrade 0002_minio_storage

./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    current
```

期望输出包含：

```text
0002_minio_storage
```

确认 schema 已升级后，再启动完整服务：

```shell
./scripts/compose.sh up -d --build
./scripts/compose.sh ps
./scripts/compose.sh logs --tail=100 backend storage-service minio-init
```

`0003_image_file_annotation_json` 应在完成本文件的数据/文件迁移并验证影像访问正常后，
再按 `0003-image-file-annotation-json.md` 单独执行。

## 5. 先 dry-run 文件迁移
```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint python \
    -v "$UPLOADS_VOLUME:/legacy/uploads:ro" \
    -v "$BACKUP_ROOT:/backup" \
    backend \
    /app/migrations/migrate_local_files_to_minio.py \
      --uploads-dir /legacy/uploads \
      --backup-dir /backup \
      --dry-run
```
看输出是否有 [missing]

## 6. 正式迁移到 MinIO
```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint python \
    -v "$UPLOADS_VOLUME:/legacy/uploads:ro" \
    -v "$BACKUP_ROOT:/backup" \
    backend \
    /app/migrations/migrate_local_files_to_minio.py \
      --uploads-dir /legacy/uploads \
      --backup-dir /backup
```
这个脚本会做三件事：
- 把 /legacy/uploads/completed 备份到宿主机 $BACKUP_ROOT/completed
- 上传 active image_files 对应文件到 medical-image-files
- 回填 image_files.storage_etag

## 7. 验证迁移结果
```shell
docker exec medical_backend python - <<'PY'
  from sqlalchemy import create_engine, text
  import os
  engine = create_engine(os.environ["DATABASE_URL"])
  with engine.connect() as conn:
      row = conn.execute(text("""
          SELECT
            COUNT(*) AS active_total,
            SUM(storage_etag IS NOT NULL) AS migrated
          FROM image_files
          WHERE is_deleted = 0
      """)).mappings().one()
      print(dict(row))
  PY
```

## 8. 迁移完成后再清理
至少保留 uploads_data.full.tgz 和 $BACKUP_ROOT/completed 一段时间。确认无问题后，再考虑删除旧 Docker volume：
```shell
docker volume rm "$UPLOADS_VOLUME"
```
