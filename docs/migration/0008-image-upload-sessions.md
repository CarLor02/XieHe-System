# 0008 统一影像上传会话

本次迁移新增 `image_upload_sessions`，把浏览器 multipart 上传的临时状态从
`image_files` 中移出。对应 Alembic revision 为 `0008_image_upload_sessions`。

新链路在对象存储完成并通过大小、可选哈希校验前，不创建 `image_files`。因此
`image_files` 继续表示可被业务读取的正式影像，而不是尚未完成的上传意图。

## 数据与兼容决策

- 单文件和批量导入统一写入 `image_upload_sessions`。
- `session_id` 是对外 UUID；`image_file_id` 只在完成后写入，并保持唯一。
- `image_import_items.image_file_id` 在完成前为空。
- `image_import_items.upload_id` 与历史 `image_files.status=UPLOADING` 暂时保留，
  仅供历史对账使用；新链路不再写入。
- 影像中心默认排除历史 `UPLOADING` 占位记录，但显式传入
  `file_status=UPLOADING` 时仍可诊断查询。
- 迁移不删除历史记录，也不访问 MinIO。

## 发布顺序

1. 备份数据库并执行 `alembic upgrade 0008_image_upload_sessions`。
2. 同时发布 Backend 与使用新 API contract 的前端。
3. 保持 storage-service、Kafka、AI Worker 和 ThumbnailWorker 可用。
4. 先检查过期上传：

   ```bash
   cd backend
   uv run python -m app.contexts.imaging.interface.cli.reconcile_stale_upload_sessions \
     --dry-run --stale-after-seconds 1800 --batch-size 100
   ```

5. 核对统计后分批执行：

   ```bash
   cd backend
   uv run python -m app.contexts.imaging.interface.cli.reconcile_stale_upload_sessions \
     --execute --stale-after-seconds 1800 --batch-size 100
   ```

命令支持 `--from-id` 和 `--limit`。`--dry-run` 与 `--execute` 必须二选一；当
storage-service 不可用或任务发布失败时返回非零退出码。命令可重复执行，已完成会话
和已清理的历史占位不会再次进入扫描。

## 完成竞态

完成接口先获取 60 秒 lease，再在数据库事务外执行对象存储调用。每次完成都先
`stat_object`：若对象已经存在，则跳过重复 `CompleteMultipartUpload`；若对象不存在，
才使用会话中持久化的 `upload_id` 与客户端 parts 完成上传。

这条规则专门覆盖以下竞态：MinIO 已经完成对象，但 Backend 在写回数据库前中断。
此时会话保持 `COMPLETING`；lease 过期后的接口重试或对账 CLI 会先 stat 到对象，重新
执行唯一的正式影像落库事务，而不会再次完成 multipart 或创建重复 `image_files`。

## 回滚

先回滚前端和 Backend 到旧合同，再执行：

```bash
cd backend
uv run alembic downgrade 0007_image_file_derivatives
```

降级只删除 `image_upload_sessions`。已通过新链路创建的正式 `image_files` 和对象不会
删除；回滚前必须确认旧 Backend 能读取这些正式影像。
