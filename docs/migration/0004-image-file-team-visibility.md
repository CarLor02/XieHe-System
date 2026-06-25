# 0004 影像团队归属迁移

本迁移把旧的“按上传者团队关系推断可见性”切换为“影像显式归属团队”。

## 生产步骤

1. 备份数据库。
2. 部署后端代码。
3. 执行 Alembic：

```bash
cd /path/to/XieHe-System
backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

4. 先 dry-run 迁移脚本：

```bash
cd /path/to/XieHe-System
backend/.venv/bin/python backend/migrations/migrate_image_file_team_visibility.py
```

5. 核对输出统计：

- `auto_assigned`：上传者只有一个活跃团队，脚本可自动写入团队归属。
- `personal_system_admin`：系统管理员旧影像保持个人归属。
- `personal_no_team`：无团队上传者旧影像保持个人归属。
- `personal_multi_team`：上传者属于多个团队，旧影像保持个人归属，后续手动编辑。

6. 确认统计后执行写入：

```bash
cd /path/to/XieHe-System
backend/.venv/bin/python backend/migrations/migrate_image_file_team_visibility.py --apply
```

7. 抽样验证：

```sql
SELECT image_file_id, team_id
FROM image_file_team_visibility
ORDER BY image_file_id
LIMIT 20;
```

8. 发布前端。多团队上传者的旧影像由可见用户在影像中心通过“编辑信息”手动补团队归属。
