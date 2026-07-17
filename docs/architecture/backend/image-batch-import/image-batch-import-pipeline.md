# 影像批量导入流水线

## 目标

批量导入不再等待全部文件上传后，由 FastAPI `BackgroundTasks` 在单个
Backend 进程内并发执行 AI。每个文件完成对象存储确认后立即形成独立任务：

```text
Browser preprocess
  -> multipart upload
  -> complete one import item
  -> persist AITask
  -> Kafka
  -> AI Worker
  -> AP/LAT model HTTP API
  -> annotation persistence
```

该设计解决以下问题：

- 上传 1000 张图片时，不能在浏览器和 Backend 中同时保留 1000 个活跃请求。
- AI 处理不能依赖某个 Uvicorn Worker 的进程内任务和信号量。
- 页面关闭后仍能查询任务进度。
- Kafka 重投、接口重试和 Worker 重启不能重复生成标注。

系统当前通过 `BATCH_IMPORT_MAX_FILES` 限制单批文件数，默认值为 200。

## 持久化模型

### `image_import_batches`

保存批次级配置和汇总状态：

- `batch_id`：对外使用的稳定 ID。
- `uploaded_by`、`patient_id`、`description`、`team_ids`：整批共享信息。
- `total_items`、`uploaded_items`、`succeeded_items`、`failed_items`：汇总计数。
- `status`：`UPLOADING`、`PROCESSING`、`COMPLETED`、
  `PARTIAL_FAILED` 或 `FAILED`。

### `image_import_items`

每张影像对应一条记录：

- 浏览器侧 `client_file_id` 和文件元数据。
- `image_file_id`、当前 multipart `upload_id`。
- 独立的 `upload_status` 与 `ai_status`。
- 最近一次失败原因。

上传状态为：

```text
PENDING -> SESSION_CREATED -> UPLOADED
                       \----> FAILED
```

AI 状态为：

```text
PENDING -> QUEUED -> RUNNING -> SUCCEEDED
             ^          \----> FAILED
             |                    |
             +------ retry -------+
```

### `ai_tasks`

沿用现有 AI 任务表，新增：

- `batch_item_id`：关联批量导入项。
- `attempt_count`：Worker 实际领取任务的次数。

旧数据库可能存在 `study_id`，迁移会保留该字段但允许为空；新任务始终使用
`image_file_id`。

## MQ 分层

消息队列代码分为应用语义层和 Kafka 传输层：

```text
app/shared/mq/
├── publisher.py          # Publisher 协议、PublishMessage
├── subscriber.py         # Subscriber 协议、ReceivedMessage、ACK/RETRY
└── kafka/
    ├── producer.py       # Kafka 字节发送和生命周期
    ├── consumer.py       # Kafka record、seek、显式 commit
    ├── publisher.py      # JSON 序列化和 Kafka Publisher 适配
    └── subscriber.py     # JSON 解码和 ACK/RETRY 适配
```

约束：

- API/usecase 只能依赖 `Publisher`，不能直接操作 `AIOKafkaProducer`。
- Worker 业务处理器只返回 `ACK` 或 `RETRY`，不能直接提交 offset。
- `KafkaProducer` 使用 `acks=all` 和幂等发送。
- `KafkaConsumer` 禁用自动提交。
- 非法 JSON 会记录错误并提交 offset，避免永久阻塞分区。
- 处理器返回 `RETRY` 时，Consumer seek 回原 offset，延迟后重新消费。

## 事件协议

Topic 默认为 `medical.image-ai.predict.v1`，消息 key 为 `image_file_id`。

```json
{
  "event_type": "image.ai.predict.requested",
  "version": 1,
  "task_id": "8a30f2...",
  "batch_id": "5a12d3...",
  "batch_item_id": 42,
  "image_file_id": 180,
  "requested_by": 7
}
```

同一影像使用相同 key，使其消息在 topic 分区数不变时保持分区内顺序。

## 发布与幂等

单文件完成接口按以下顺序执行：

1. 完成 multipart upload 并校验对象大小和可选哈希。
2. 更新 `image_files` 和 `image_import_items`。
3. 创建或复用该 item 的 `AITask`。
4. 提交数据库事务。
5. 发布 Kafka 消息。

当前没有 transactional outbox，因此数据库提交与 Kafka 发布不是原子事务。
发布失败时：

- 已上传影像和 `AITask(PENDING)` 保持不变。
- item 回到 `ai_status=PENDING` 并记录可重试错误。
- 用户可以调用重新入队接口。
- 重复完成或重复入队会复用同一任务，不创建重复任务。

## AI Worker

`python -m app.workers.ai_worker` 启动独立 Worker。一个进程按照
`AI_WORKER_CONCURRENCY` 创建多个同组 Subscriber，默认并发数为 2。

处理步骤：

1. 校验事件类型和版本。
2. 锁定 `AITask`，终态任务直接 ACK。
3. 将任务、item 和影像更新为运行状态并提交。
4. 根据影像 `description` 选择 AP 或 LAT 模型 URL。
5. 调用现有模型服务的 `/api/measurement`。
6. 使用与同步 AI 相同的 annotation 转换和持久化规则写回。
7. 成功后更新任务和批次汇总，再提交 offset。

Worker 不加载模型，也不替代 AP/LAT 模型服务。标注页单张 AI 测量继续同步调用
公共 `AiModelClient`。

模型调用重试：

- 网络错误及 `408/429/502/503/504` 属于临时故障。
- 单次消费最多按 `AI_MODEL_MAX_RETRIES` 重试。
- 临时故障耗尽重试后返回 `RETRY`，不提交 Kafka offset。
- 其他 `4xx` 属于终态业务失败，更新任务后 ACK。

## 部署

主系统 Compose 增加 `medical_ai_worker`：

- 与 Backend 复用 `xiehe-medical-backend:local` 镜像。
- 等待 Backend 健康，确保 Alembic 迁移先完成。
- 等待 `kafka-init` 创建 AI topic。
- 不开放 HTTP 端口。

关键变量：

| 变量 | 默认值 |
| --- | --- |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` |
| `AI_TASK_KAFKA_TOPIC` | `medical.image-ai.predict.v1` |
| `AI_TASK_KAFKA_GROUP_ID` | `medical-image-ai-worker-v1` |
| `AI_TASK_KAFKA_PARTITIONS` | `4` |
| `AI_WORKER_CONCURRENCY` | `2` |
| `BATCH_IMPORT_MAX_FILES` | `200` |

本版本不实现 transactional outbox、DLQ、任务取消、SSE 或吞吐监控。
