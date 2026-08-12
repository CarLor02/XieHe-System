# 0006 下线遗留系统表映射

本次清理移除了未接入真实业务链路的邮件、模拟通知、旧监控和伪实时推送代码，并停止
SQLAlchemy 对以下遗留表的映射：

- `notifications`
- `system_alerts`
- `system_logs`
- `system_monitors`

## 决策

1. 应用、后台任务和 API 不再读取或写入这些表。
2. 本轮不删除物理表及其中的数据，也不修改已发布的初始 migration。
3. Alembic `include_object` 明确忽略这些表，避免 autogenerate 因 ORM 不再映射而生成
   `DROP TABLE`。
4. 物理表保持冻结；不得通过恢复旧 ORM 或双写代码重新启用。
5. 未来只有在生产数据完成备份和核验后，才能通过独立 migration 删除这些表。

## 后续删除前检查

删除物理表前至少记录每张表的行数和最后更新时间，并完成数据库全量备份：

```sql
SELECT COUNT(*) AS rows_count, MAX(created_at) AS last_created_at FROM notifications;
SELECT COUNT(*) AS rows_count, MAX(created_at) AS last_created_at FROM system_alerts;
SELECT COUNT(*) AS rows_count, MAX(created_at) AS last_created_at FROM system_logs;
SELECT COUNT(*) AS rows_count, MAX(created_at) AS last_created_at FROM system_monitors;
```

确认没有外部报表、运维脚本或人工查询依赖后，再新建可审计的 Alembic revision 执行删除。
