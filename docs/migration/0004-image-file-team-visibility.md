# 0004 影像团队归属迁移

本迁移把旧的“按上传者团队关系推断可见性”切换为“影像显式归属团队”。

## 生产步骤

1. 备份数据库。
2. 部署后端代码并重建/重启 `medical_backend` 容器。后端启动脚本会自动执行 `alembic upgrade head`。
3. 如需手动确认迁移状态，在容器内执行：

```bash
docker exec -it medical_backend alembic current
docker exec -it medical_backend alembic upgrade head
```

4. 先 dry-run 迁移脚本：

```bash
docker exec -it medical_backend python migrations/migrate_image_file_team_visibility.py
```

如果这里提示脚本不存在，说明 `medical_backend` 还没有使用包含本迁移的新镜像，先重建并重启后端容器。

5. 核对输出统计：

- `auto_assigned`：上传者只有一个活跃团队，脚本可自动写入团队归属。
- `personal_system_admin`：系统管理员旧影像保持个人归属。
- `personal_no_team`：无团队上传者旧影像保持个人归属。
- `personal_multi_team`：上传者属于多个团队，旧影像保持个人归属，后续手动编辑。

6. 确认统计后执行写入：

```bash
docker exec -it medical_backend python migrations/migrate_image_file_team_visibility.py --apply
```

7. 抽样验证：

```sql
SELECT image_file_id, team_id
FROM image_file_team_visibility
ORDER BY image_file_id
LIMIT 20;
```

8. 发布前端。多团队上传者的旧影像由可见用户在影像中心通过“编辑信息”手动补团队归属。
