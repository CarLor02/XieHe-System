# Known Issues

## Device-dependent Network Behavior (Resolved)

- Symptom: the same build may connect normally on one phone but fail on another with `socket failed: ECONNREFUSED`.
- Root cause confirmed: the failing phone had app-level network access permission disabled.
- Fix: enable network access permission for the app on that device.
- Current status: backend connectivity works normally after permission is enabled.

## 消息通知系统

- `GET /api/v1/notifications/messages/stats` 与 `GET /api/v1/notifications/messages` 返回数据不一致。当前真实后端会返回 `stats.total_messages = 15`、`stats.unread_messages = 3`，但消息列表接口只返回 2 条消息，且 `pagination.total = 2`。
- `PUT /api/v1/notifications/messages/{message_id}/read` 虽然返回 `200 消息已标记为已读`，但随后重新查询列表时，`is_read` 仍然保持原值，后端未持久化已读状态。
- `DELETE /api/v1/notifications/messages/{message_id}` 虽然返回 `200 消息已删除`，但随后重新查询列表时，该消息仍然存在，后端未持久化删除状态。
- `POST /api/v1/notifications/messages` 当前真实后端返回 `500 发送消息失败: 'dict' object has no attribute 'id'`。

## 影像文件管理

- `GET /api/v1/image-files/patient/{patient_id}` 与 `GET /api/v1/image-files` 当前返回口径不一致。`2026-03-30` 实测 `patient_id = 35` 时，患者专用接口返回 22 条影像，但影像中心依赖的列表接口总共只返回 5 条，其中属于 35 号患者的只有 2 条。
- 当前怀疑原因是接口权限过滤不一致：更高权限用户上传到同一患者名下的影像，在 `GET /api/v1/image-files` 中被权限筛掉，但 `GET /api/v1/image-files/patient/{patient_id}` 仍然直接返回。
- 在后端确认两个接口的权限策略一致之前，影像中心无法保证展示某个患者的完整影像集合。

GET /api/v1/upload/records

POST /api/v1/auth/register

POST /api/v1/reports/

PUT /api/v1/reports/{report_id}
POST /api/v1/notifications/messages
