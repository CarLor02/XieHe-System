# 0007 影像派生对象与缩略图回填

本次迁移新增 `image_file_derivatives`，把缩略图从 `image_files` 的历史路径字段中拆出，
作为与原图版本绑定的对象存储派生物管理。对应 Alembic revision 为
`0007_image_file_derivatives`。

`image_files.thumbnail_path` 暂时保留，用于识别旧文件系统数据，但新链路不读取其值作为
对象存储 key，也不再写入该字段。DICOM 本轮不生成缩略图。

## 数据库结构

- `(image_file_id, variant)` 唯一，当前 variant 为 `CARD_THUMBNAIL`。
- `source_storage_etag` 记录生成缩略图时的原图版本。
- `storage_bucket/object_key/storage_etag` 记录派生对象自身的位置和版本。
- `PENDING/PROCESSING/READY/FAILED`、lease、retry 字段承载异步任务状态。
- `(status, next_retry_at)` 索引供 ThumbnailWorker 恢复扫描使用。

Alembic 只创建结构，不在迁移事务里读取对象存储或生成缩略图。

## 发布顺序

1. 备份数据库并执行 `alembic upgrade 0007_image_file_derivatives`。
2. 启动 Backend、Kafka topic 初始化和 `thumbnail-worker`。
3. 先 dry-run 核对历史数量：

   ```bash
   cd backend
   uv run python -m app.contexts.imaging.interface.cli.backfill_thumbnails \
     --batch-size 100 --dry-run
   ```

4. 正式分页入队：

   ```bash
   cd backend
   uv run python -m app.contexts.imaging.interface.cli.backfill_thumbnails \
     --batch-size 100
   ```

5. 确认 READY/FAILED 分布稳定后，再发布使用 `variant=thumbnail` 的前端。

CLI 还支持 `--from-id` 和 `--limit`。`--from-id` 包含指定 ID；命令按影像 ID 递增分页，
可重复执行。已存在当前原图 ETag 对应 READY 缩略图的影像会跳过，发布失败会保留
PENDING 记录并返回非零退出码，Worker 扫描器之后仍可恢复。

缩略图渲染契约自 `v2` 起进入对象 key。仅有相同原图 ETag 还不足以判定 READY 有效；
对象必须同时属于当前渲染版本。部署渲染算法升级后，应再次先执行 `--dry-run`，再用
`--from-id/--limit` 分批运行 backfill。旧版对象引用会保留到新版 READY 写回成功，随后由
Worker 清理，不需要修改数据库结构或直接覆盖对象存储中的旧 key。

## 运行核对

```sql
SELECT status, COUNT(*)
FROM image_file_derivatives
WHERE variant = 'CARD_THUMBNAIL'
GROUP BY status;

SELECT id, image_file_id, retry_count, last_error, next_retry_at
FROM image_file_derivatives
WHERE status = 'FAILED'
ORDER BY updated_at DESC
LIMIT 100;
```

影像内容替换后应出现新 `source_storage_etag` 的任务；重命名和修改检查类型不应创建新任务。
缩略图失败不得改变 `image_files.status` 或标注内容。

## 回滚

先回滚前端使影像中心重新请求原图，再停止 ThumbnailWorker，最后执行：

```bash
cd backend
uv run alembic downgrade 0006_annotation_single_source
```

降级会删除派生记录表，但不会主动删除对象存储中的 WebP。生产环境降级前应按
`{file_uuid}/derivatives/card-thumbnail/` 前缀制定独立对象清理计划。
