# 服务器 Alembic 接入指南

本指南用于把已有服务器数据库纳入 Alembic 管理。当前
`backend/alembic/versions/0001_initial_schema.py` 是从空库创建当前 schema 的
初始迁移，不会兼容已经存在业务表的数据库。

## 新数据库

```bash
cd backend
alembic upgrade head
```

## 已有数据库

已有数据库在接入 Alembic 前必须先备份，并确认表结构已经等同于当前模型。
确认无误后只写入 Alembic 版本标记：

```bash
cd backend
alembic stamp head
```

不要对已有业务表的数据库执行 `alembic upgrade head`，否则初始迁移会尝试重新
创建已经存在的表。

## 本地文件到 MinIO

`migrate_local_files_to_minio.py` 只负责把历史本地文件复制到 MinIO，并回填对象
存储信息。它不是 Alembic schema migration，应在 schema 已经确认或 stamp 后按
需单独执行。
