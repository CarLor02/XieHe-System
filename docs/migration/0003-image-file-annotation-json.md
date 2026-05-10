# 0003: 将 image_files.annotation 迁移为 JSON

这一步只处理 `image_files.annotation` 的字段类型：从历史的 `TEXT` 字符串迁移为
MySQL 8.0 原生 `JSON`。文件对象、bucket、`storage_etag` 等 MinIO 数据迁移不在本步骤内。

迁移脚本会先检查现有 `annotation` 是否都是合法 JSON。只要发现任何不合法值，
`alembic upgrade` 会直接失败，不会修改字段类型。

## 1. 确认前置 revision

执行本文件前，服务器应已经完成 `0002-migrate-files-to-minio.md`，并且影像访问已经验证正常。

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    current
```

期望输出包含：

```text
0002_minio_storage
```

## 2. 备份数据库

```shell
export BACKUP_ROOT=/srv/xiehe-backups/annotation-json-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"

docker exec medical_mysql sh -c \
    'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers medical_imaging_system' \
    > "$BACKUP_ROOT/medical_imaging_system.before-annotation-json.sql"
```

## 3. 预检查 annotation JSON 合法性

```shell
docker exec medical_mysql sh -c \
    'mysql -u root -p"$MYSQL_ROOT_PASSWORD" medical_imaging_system -e "
      SELECT COUNT(*) AS invalid_count
      FROM image_files
      WHERE annotation IS NOT NULL
        AND JSON_VALID(annotation) = 0;

      SELECT id, file_uuid, original_filename, LEFT(annotation, 200) AS annotation_prefix
      FROM image_files
      WHERE annotation IS NOT NULL
        AND JSON_VALID(annotation) = 0
      ORDER BY id
      LIMIT 20;
    "'
```

`invalid_count` 必须为 `0`。如果不是 `0`，先人工修复这些行，再重新执行预检查。

## 4. 执行 Alembic 迁移

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    upgrade 0003_image_file_annotation_json
```

如果仍存在不合法 JSON，迁移会失败并输出类似：

```text
image_files.annotation contains invalid JSON; refusing migration
```

这时字段类型不会被改成 `JSON`，需要先修复数据后再重试。

## 5. 验证字段类型和 revision

```shell
docker exec medical_mysql sh -c \
    'mysql -u root -p"$MYSQL_ROOT_PASSWORD" medical_imaging_system -e "
      SHOW COLUMNS FROM image_files LIKE '\''annotation'\'';
      SELECT version_num FROM alembic_version;
    "'
```

期望结果：

- `annotation` 的类型为 `json`
- `alembic_version.version_num` 为 `0003_image_file_annotation_json`

## 6. 验证后端接口

迁移后，后端接口里的 `annotation` 是 JSON 对象，不再是 JSON 字符串。前端保存标注时也会直接提交对象。

至少验证一个已有影像详情或列表接口，确认响应中的 `annotation` 不是带转义的字符串：

```shell
curl -sS \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "http://127.0.0.1:8080/api/v1/image-files/$IMAGE_FILE_ID" \
    | jq '.data.annotation'
```

期望输出是对象或 `null`，例如：

```json
{
  "measurements": []
}
```
