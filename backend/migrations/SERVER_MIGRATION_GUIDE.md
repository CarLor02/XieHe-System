# 服务器 Alembic 接入指南

本指南用于把已有服务器数据库纳入 Alembic 管理。当前
`backend/alembic/versions/0001_initial_schema.py` 对应服务器尚未使用 Alembic
时导出的 schema 基线；`0002_minio_storage.py` 负责把影像文件存储字段迁移到
MinIO。

## 新数据库

```bash
cd backend
alembic upgrade head
```

## 已有数据库

已有服务器数据库在接入 Alembic 前必须先备份，并确认表结构等同于
`0001_initial_schema`。确认无误后直接执行升级：

```bash
cd backend
alembic upgrade head
```

`0001_initial_schema` 只包含 `CREATE TABLE IF NOT EXISTS` 建表语句；已有表不会
被重建，Alembic 会记录基线版本，然后继续执行 `0002_minio_storage.py` 完成 MinIO
字段迁移。

已经在本地手动/历史 Alembic 迁移到 MinIO schema 的数据库，只需要重建版本标记：

```bash
cd backend
alembic stamp --purge head
```

## 本地文件到 MinIO

`migrate_local_files_to_minio.py` 只负责把历史本地文件复制到 MinIO，并回填对象
存储信息。它不是 Alembic schema migration，应在 `alembic upgrade head` 完成后
按需单独执行。
