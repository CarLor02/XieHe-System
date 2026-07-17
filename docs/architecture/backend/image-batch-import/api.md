# 影像批量导入 API

所有接口位于 `/api/v1/upload`，使用现有认证响应信封。

## 获取配置

```http
GET /api/v1/upload/batches/config
```

返回：

```json
{
  "max_files": 200,
  "session_window_size": 10
}
```

前端获取失败时使用相同默认值。

## 创建批次

```http
POST /api/v1/upload/batches
```

请求：

```json
{
  "patient_id": 12,
  "description": "正位X光片",
  "team_ids": [3],
  "files": [
    {
      "client_file_id": "browser-file-1",
      "filename": "ap.png",
      "size": 3145728,
      "mime_type": "image/png",
      "file_hash": null
    }
  ]
}
```

服务端校验患者、团队归属权限、文件类型和动态批次上限。响应包含批次摘要及
item ID；后续接口使用服务端 item ID。

## 创建上传会话

```http
POST /api/v1/upload/batches/{batch_id}/sessions
```

请求最多包含 10 个 item：

```json
{
  "item_ids": [101, 102, 103]
}
```

返回每个 item 的 MinIO multipart 信息：

```json
{
  "items": [
    {
      "item_id": 101,
      "client_file_id": "browser-file-1",
      "image_file_id": 180,
      "file_uuid": "...",
      "storage_bucket": "medical-image-files",
      "object_key": ".../ap.png",
      "upload_id": "...",
      "part_size": 10485760,
      "expires_in": 3600,
      "parts": [
        {
          "part_number": 1,
          "url": "..."
        }
      ]
    }
  ]
}
```

## 完成单文件上传

```http
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/complete
```

请求：

```json
{
  "upload_id": "...",
  "parts": [
    {
      "part_number": 1,
      "etag": "..."
    }
  ],
  "file_hash": null
}
```

该接口只完成一个文件，成功后立即持久化 AI 任务并发布 Kafka。Kafka 暂不可用
不会回滚已经完成的对象上传；响应 item 会保留 `PENDING` 状态和错误，供重新
入队。

## 记录上传失败

```http
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/upload-failed
```

```json
{
  "error": "上传分片超时"
}
```

该操作将 upload 和 AI 状态置为失败，并参与批次汇总。它不阻止同批其他文件。

## 重新入队

```http
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/enqueue
```

只允许对已上传 item 调用。接口复用该 item 现有任务：

- 已完成任务直接返回。
- 失败任务重置为 `PENDING`。
- Kafka 发布失败返回 `503`，任务仍可再次提交。

## 查询批次

```http
GET /api/v1/upload/batches?page=1&page_size=10&status=PROCESSING
```

`status` 可选。当前只返回登录用户创建的批次，使用标准分页结构。

批次项示例：

```json
{
  "batch_id": "...",
  "patient_id": 12,
  "description": "正位X光片",
  "team_ids": [3],
  "status": "PROCESSING",
  "total_items": 20,
  "uploaded_items": 20,
  "succeeded_items": 8,
  "failed_items": 1,
  "created_at": "2026-07-17T12:00:00",
  "updated_at": "2026-07-17T12:01:00",
  "completed_at": null
}
```

## 查询批次项

```http
GET /api/v1/upload/batches/{batch_id}/items?page=1&page_size=20
```

响应项：

```json
{
  "id": 101,
  "client_file_id": "browser-file-1",
  "filename": "ap.png",
  "size": 3145728,
  "mime_type": "image/png",
  "image_file_id": 180,
  "upload_status": "UPLOADED",
  "ai_status": "RUNNING",
  "error": null,
  "created_at": "2026-07-17T12:00:00",
  "updated_at": "2026-07-17T12:01:00"
}
```

## 状态与错误语义

| HTTP 状态 | 含义 |
| --- | --- |
| `400` | 文件、批次上限、对象大小或哈希校验失败 |
| `403` | 批次不属于当前用户或团队归属无权限 |
| `404` | 患者、批次、item 或影像不存在 |
| `409` | 上传会话失效，或尚未满足重新入队条件 |
| `502` | 对象存储服务不可用 |
| `503` | Kafka 暂不可用，持久化任务仍保留 |

旧 `/batch/sessions`、`/batch/complete` 和 `/batch/status` 不再提供。单张上传
`/sessions`、`/sessions/{image_file_id}/complete` 保持不变。
