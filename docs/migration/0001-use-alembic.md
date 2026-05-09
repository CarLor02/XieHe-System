# 0001: 将既有服务器数据库接入 Alembic

这一步只把服务器上已经存在的数据库结构登记为 Alembic 的基线版本，不做 MinIO
字段变更，也不迁移本地文件。

服务器当前表结构应与 `backend/alembic/versions/0001_initial_schema.py` 对应。
`0001_initial_schema` 只包含 `CREATE TABLE IF NOT EXISTS` 建表语句，作为既有
schema 的 base revision 使用。

## 1. 进入维护窗口并备份数据库

在执行任何 revision 操作前，先停止用户写入，并备份当前数据库。

```shell
export BACKUP_ROOT=/srv/xiehe-backups/alembic-base-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"

docker exec medical_mysql sh -c \
    'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers medical_imaging_system' \
    > "$BACKUP_ROOT/medical_imaging_system.before-alembic.sql"
```

## 2. 部署代码但不要先启动后端默认入口

当前后端容器入口会自动执行 `alembic upgrade head`。因此，在服务器还没有被
标记到 `0001_initial_schema` 之前，不要直接执行完整的 `up -d --build` 启动后端。

先构建后端镜像：

```shell
./scripts/compose.sh build backend
```

确保 MySQL 正在运行：

```shell
./scripts/compose.sh up -d mysql
./scripts/compose.sh ps mysql
```

## 3. 确认服务器尚未使用 Alembic

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    current
```

如果这是服务器第一次接入 Alembic，通常不会显示 revision，或者会提示
`alembic_version` 表不存在。不要在这里执行 `upgrade head`。

## 4. 将现有 schema 标记为 0001 base

服务器已有表结构已经等价于 `0001_initial_schema`，所以这里使用 `stamp` 登记
版本，而不是重新建表。

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    stamp 0001_initial_schema
```

## 5. 验证 base revision

```shell
./scripts/compose.sh run --rm --no-deps \
    --entrypoint alembic \
    backend \
    current
```

期望输出包含：

```text
0001_initial_schema
```

到这里为止，服务器数据库只被标记为 Alembic `0001` 基线，还没有执行 MinIO
字段迁移。之后再继续执行 `0002-migrate-files-to-minio.md`。
