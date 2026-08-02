# 0005 影像标注切换为单一事实源

本次迁移将 `image_files.annotation` 作为影像当前标注内容的唯一事实源，将
`image_files.status` 作为影像处理状态的唯一事实源。对应的 Alembic revision 为
`0006_annotation_single_source`；`0005` 是本目录文档序号，Alembic 的 `0005` 已用于
批量影像导入流水线。

历史表 `image_annotations` 从本次发布开始下线：应用、AI Worker、导出和影像状态筛选
都不再读取或写入该表，但本轮不会删除表及其中的数据。待生产环境稳定运行并完成核对后，
再通过独立 migration 决定是否删除。

## 1. 数据库变更

`image_files` 新增以下当前状态字段：

- `annotation_version`：标注快照乐观锁版本。
- `has_annotation`：当前快照是否包含用户可见标注。
- `annotation_created_at`、`annotation_created_by`：首次标注操作的时间和用户。
- `annotation_updated_at`、`annotation_updated_by`：最近标注操作的时间和用户。

新增两个 append-only 审计表：

- `image_annotation_revisions`：保存每次成功变更后的完整 JSON 快照。
- `image_annotation_item_events`：按 measurement ID、关键点标签及标准距离记录逐项变化。

从未标注的影像保持 `annotation IS NULL` 且版本为 `0`。用户明确清空标注后保存规范化
空 JSON，版本仍会增长，因此可以和“从未标注”区分。

## 2. 迁移决策

1. 当前标注只写 `image_files.annotation`，不再双写 `image_annotations`。
2. 影像中心的待处理、处理中、已处理和失败筛选只使用 `image_files.status`。
3. 旧表中能够映射到 JSON 的逐条测量数据，仅用于迁移缺失 JSON 的异常环境。
4. 已有 JSON 优先级高于旧表记录，避免旧的、已删除的 measurement 恢复到当前快照。
5. 迁移只建立当前基线，不伪造无法还原的历史修改过程；迁移后的每次保存提供完整审计。
6. 旧表保持冻结，不通过恢复双写作为回滚手段，否则会重新形成两个事实源。

## 3. 发布前备份和预检查

进入维护窗口，停止标注保存和批量 AI Worker，再备份数据库：

```shell
export BACKUP_ROOT=/srv/xiehe-backups/annotation-single-source-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"

docker exec medical_mysql sh -c \
  'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers medical_imaging_system' \
  > "$BACKUP_ROOT/medical_imaging_system.before-annotation-single-source.sql"
```

记录迁移前的数据分布：

```sql
SELECT
  COUNT(*) AS active_images,
  SUM(annotation IS NOT NULL) AS json_images
FROM image_files
WHERE is_deleted = 0;

SELECT
  COUNT(DISTINCT image_file_id) AS legacy_images,
  COUNT(*) AS legacy_rows,
  MAX(updated_at) AS legacy_last_updated_at
FROM image_annotations
WHERE is_deleted = 0 OR is_deleted IS NULL;
```

确认当前 revision 为 `0005_image_import_pipeline`：

```shell
./scripts/compose.sh run --rm --no-deps --entrypoint alembic backend current
```

## 4. 执行迁移

```shell
./scripts/compose.sh run --rm --no-deps \
  --entrypoint alembic \
  backend \
  upgrade 0006_annotation_single_source
```

迁移会执行以下数据处理：

- 对已有 `image_files.annotation` 创建版本 `1` 的 `MIGRATION/BASELINE` revision。
- 从旧表最早和最晚记录回填可确认的聚合审计字段。
- 为当前可见 measurement、关键点和标准距离建立 `BASELINE` item event。
- 如果某影像只有旧表记录而没有 JSON，则合成最小兼容 JSON，measurement ID 使用
  `legacy-{image_annotations.id}`。
- 将历史 MySQL JSON `null` 规范化为 SQL `NULL`，保持“从未标注”的语义一致。
- 非空快照状态设为 `PROCESSED`；显式空快照状态设为 `UPLOADED`。

## 5. 迁移后验证

确认 revision、字段和审计表：

```shell
./scripts/compose.sh run --rm --no-deps --entrypoint alembic backend current

docker exec medical_mysql sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" medical_imaging_system -e "
    SHOW COLUMNS FROM image_files LIKE '\''annotation_version'\'';
    SHOW COLUMNS FROM image_files LIKE '\''has_annotation'\'';
    SHOW TABLES LIKE '\''image_annotation_revisions'\'';
    SHOW TABLES LIKE '\''image_annotation_item_events'\'';
  "'
```

核对当前快照与基线 revision：

```sql
SELECT
  SUM(annotation IS NOT NULL) AS annotation_snapshots,
  SUM(annotation_version > 0) AS versioned_snapshots,
  SUM(has_annotation = 1) AS non_empty_snapshots
FROM image_files;

SELECT COUNT(*) AS baseline_revisions
FROM image_annotation_revisions
WHERE version = 1 AND source = 'MIGRATION' AND reason = 'BASELINE';

SELECT image_file_id, version, COUNT(*)
FROM image_annotation_revisions
GROUP BY image_file_id, version
HAVING COUNT(*) > 1;
```

最后一条查询必须返回空结果。

至少完成以下接口操作：

1. 打开影像中心，确认列表和处理状态筛选正常。
2. 打开一张影像并保存标注，确认 `annotation_version` 增长。
3. 清空标注并保存，确认 `has_annotation = 0`、状态为 `UPLOADED`，且 revision 保留。
4. 执行一次批量 AI 导入，确认 AI 结果也写入 revision 和 item event。
5. 替换一张影像内容，确认标注清空且 revision 原因为 `CONTENT_REPLACEMENT`。

## 6. 验证旧表已冻结

发布后记录旧表统计：

```sql
SELECT
  COUNT(*) AS row_count,
  MAX(updated_at) AS last_updated_at
FROM image_annotations;
```

完成一次人工保存、一次 AI 导入、一次清空及一次影像内容替换后再次执行。`row_count` 和
`last_updated_at` 都不应变化。代码层也不再提供 `/api/v1/measurements/{image_id}` 接口。

## 7. 回滚和未来删表条件

应用层回滚只能切回备份版本并恢复本次迁移前的数据库备份。不要在新旧版本之间临时恢复
双写，因为新 revision 中的关键点、绑定和清空语义无法无损回填到旧逐条表。

只有同时满足以下条件，才可新增 migration 删除 `image_annotations`：

- 至少一个完整生产观察周期内旧表统计没有变化。
- 人工保存、AI 导入、清空、内容替换和批量导出均已验证。
- 所有环境均不存在只保存在旧表而未进入 `image_files.annotation` 的数据。
- 已保留可恢复的删除前数据库备份。
- 仓库搜索确认运行时代码、运维脚本和外部集成都不再依赖旧表。

删除旧表是后续独立决策，不属于本次 `0005` 文档及 `0006_annotation_single_source`
revision 的执行范围。
