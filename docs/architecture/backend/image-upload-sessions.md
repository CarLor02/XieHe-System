# 统一影像上传会话架构

## 核心不变量

`image_upload_sessions` 表示上传意图和 multipart 生命周期，`image_files` 表示已经存在、
可访问且校验通过的正式影像。任何新上传路径都必须遵循：

```text
创建 INITIALIZING session
  -> 创建 multipart
  -> session READY
  -> 浏览器上传 parts
  -> 完成 lease + stat-before-complete
  -> 校验对象
  -> 单事务创建 image_files/可见性/批量关联/缩略图任务
  -> session COMPLETED
  -> 提交后发布缩略图和批量 AI 事件
```

不得为了提前返回影像 ID 而创建 `UPLOADING image_files`。批量导入只管理批次、item
状态和 AI 调度，不拥有另一套对象上传算法。

## 状态机

```text
INITIALIZING -> READY -> COMPLETING -> COMPLETED
       |          |          |
       +----------+----------+-> FAILED / EXPIRED / CANCELLED
```

- `INITIALIZING` 已落库，但 storage-service 尚未返回 multipart ID。
- `READY` 已持久化 upload ID 和预签名过期时间。
- `COMPLETING` 持有短 lease；同一会话的并发完成返回 409。
- `COMPLETED` 必须已有唯一 `image_file_id`，重复完成直接返回该 ID。
- 为同一个批量 item 重建会话时，在同一事务中锁定 item、取消原非终态会话并插入
  新 `INITIALIZING` 会话，提交后再尽力 abort 旧 multipart。旧请求从 storage-service
  返回后必须重新锁定并检查自身状态；若已被替换，则 abort 刚创建的 multipart，不能
  把 `CANCELLED` 覆盖为 `READY` 或 `FAILED`。

## 幂等完成与故障恢复

完成用例不在持有数据库行锁时访问 storage-service。领取 lease 后提交事务，再执行：

1. `stat_object` 已存在：校验大小、会话哈希和 ETag，跳过 complete。
2. 明确 404：使用会话内 upload ID 和客户端 parts 完成 multipart，再 stat 校验。
3. storage-service 不可用：保留 `COMPLETING` 与 lease，不把基础设施故障写成对象缺失。
4. 新事务锁定 session；若另一请求已完成则返回原影像，否则创建正式影像。

客户端通用的“上传失败”回报只能终止尚未开始完成确认的会话。一旦进入
`COMPLETING`，对象可能已经在 MinIO 中存在，失败回报返回 409 并保留 lease，等待完成
重试或对账恢复，不能把该状态覆盖为 `FAILED`。

因此“MinIO 已完成、数据库尚未写回”是可恢复状态，不是永久脏数据。恢复入口和 HTTP
完成入口共用 `ImageUploadSessionService` 的对象校验与最终落库逻辑。

## 对账

`reconcile_stale_upload_sessions` 同时扫描：

- 超过阈值的非终态新会话；
- 统一会话表上线前产生的 `UPLOADING image_files`。

对象存在且大小正确时补建或恢复正式影像；对象明确不存在时 abort multipart，并将新
会话置为 `EXPIRED`，或软删除历史占位影像。历史分支只用于迁移兼容，不得成为新上传
流程的依赖。对象大小不一致时不自动注册；storage-service 不可用时不修改状态。

对账恢复批量 item 后会复用 AI task 唯一性规则并发布事件；恢复正式影像时同步登记
缩略图 PENDING 记录。两个 Kafka 发布均发生在数据库提交后，失败不会撤销正式影像，
但 CLI 会报告失败并返回非零状态。

## 配置

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `STORAGE_PRESIGN_EXPIRES_SECONDS` | `900` | 浏览器 part URL 有效期 |
| `IMAGE_UPLOAD_COMPLETION_LEASE_SECONDS` | `60` | 完成确认 lease |
| CLI `--stale-after-seconds` | `1800` | 对账扫描最小年龄 |

MinIO incomplete multipart 生命周期规则仍建议作为部署侧兜底；它不能替代数据库会话和
业务对账，因为生命周期清理无法补建已经存在但尚未注册的正式对象。
