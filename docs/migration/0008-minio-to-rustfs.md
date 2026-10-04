# MinIO 到 RustFS：短维护窗口迁移

两个入口位于 `scripts/storage/`，使用 `backend/uv.lock` 中的 `storage-migration`
工具依赖组，不新增应用启动流程。脚本不会自动停止服务、切换 env 或 Nginx 上游。

## 准备

在仓库根目录执行，后续示例中的路径均为绝对路径；入口脚本也支持相对于调用目录的路径：

```bash
TASK_ROOT="$PWD"
MIGRATION_ENV="$TASK_ROOT/dotenv/.env.storage-migration"
RUN_DIR="$TASK_ROOT/tmp/storage-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
if [ ! -f "$MIGRATION_ENV" ]; then
  (umask 077; cp dotenv/.env.storage-migration.example "$MIGRATION_ENV")
fi
cd backend
uv sync --frozen --group storage-migration
cd "$TASK_ROOT"
```

编辑配置中的 `MIGRATION_DATABASE_URL`，使用宿主机能够访问的 MySQL 地址。
源/目标 S3 凭据默认从 `.env.minio`、`.env.rustfs` 读取；可以在迁移配置中设置
独立凭据。配置文件中的密码不要放在命令行参数里。脚本打印的信息和 JSON 清单不含密码。

## 1. 预复制与最终复制

```bash
./scripts/storage/migrate_objects.sh --env-file "$MIGRATION_ENV" copy \
  --output "$RUN_DIR/precopy.json"
```

省略 `--bucket` 会迁移源端所有 bucket 的当前对象；也可以多次指定
`--bucket medical-image-files --bucket medical-user-avatars`。
保留 bucket 名和 key，复制 Content-Type、缓存/下载头、自定义元数据、对象 tags、
bucket policy 和服务支持的 bucket CORS 配置。空 bucket 也会创建。

每个对象流式下载到临时文件并计算 SHA-256，目标端再次下载校验。已有相同内容和元数据
的对象会直接复用；不同对象默认拒绝覆盖。最终同步源端更新时，显式添加 `--overwrite`。
此选项只用于 RustFS 尚未接收业务写入的迁移阶段。脚本从不删除源对象或目标端多余对象。

源对象数量、key、大小、ETag、修改时间在整批操作前后必须保持一致，否则返回失败，
不发布新的有效清单。失败后可以重跑并复用成功复制的对象。每次成功运行使用新的清单路径，
旧清单不会被覆盖。清单保存两端 ETag、SHA-256、元数据和时间，文件权限为 `0600`。
目标上已复制的对象在源端被删除后不会自动删除；业务库引用才决定用户可见内容，目标多余
对象应在迁移完成后单独审核清理。

```bash
./scripts/storage/migrate_objects.sh --env-file "$MIGRATION_ENV" verify \
  --manifest "$RUN_DIR/precopy.json"
```

`verify` 会重新下载两端全部对象核对 SHA-256，拒绝清单之后新增或变化的源对象。
本工具不迁移版本历史、IAM 用户/密钥、生命周期配置、全局服务器设置或保留锁；源 bucket
开启或曾暂停版本管理、对象带保留锁时会拒绝。对象复制完成不等于完整应用兼容性验收。

## 2. 生成元数据计划

```bash
./scripts/storage/migrate_metadata.sh --env-file "$MIGRATION_ENV" plan \
  --manifest "$RUN_DIR/precopy.json" --output "$RUN_DIR/preplan.json"
```

`plan` 读取数据库，不写入数据库。它覆盖原图 `storage_etag`、派生对象的
`source_storage_etag/object_key/storage_etag` 以及头像 ETag。已完成上传会话的 ETag
保留为历史证据，不改成当前对象的 ETag；进行中的上传会话或缩略图任务会阻止计划生成，
需要先完成或取消。

READY 缩略图必须确实属于当前 MinIO 原图。符合当前渲染契约的缩略图在原图 ETag 改变时，
会先复制到 RustFS 的新版本化 key，然后将该新引用纳入计划。MinIO 和 RustFS 中原来的
缩略图对象都保留。旧渲染版本继续保留原 key 和查看行为，并在计划中列为
`legacy_thumbnail_ids`；不会将旧版本图像伪装为当前 `v2`。后续可以使用已有缩略图回填流程
升级，回填属于恢复写入阶段。

缺失的活跃原图/READY 缩略图、数据库与 MinIO 的 ETag 或大小不一致都会导致失败。
已删除且已物理清理的对象引用保留为审计记录，不补造对象。所有错误需要核实后重跑，
不能通过修改清单绕过检查。

## 3. 短维护窗口

先备份数据库，阻止新增用户写入，等待或取消在途分片上传，并排空现有缩略图任务；
随后暂停入口及后台写入进程，保持 MySQL、MinIO、RustFS 可访问。上传、内容替换、
删除、头像操作、缩略图生成和对象清理都必须暂停；后端进程内也有对象清理调度器，
不能只停止缩略图 worker，也不要先停 worker 再等待它完成排队任务。
脚本要求 `--writers-stopped` 表明操作员已完成这些准备，不自动操作 Compose。

预复制之后的计划不能直接当作最终计划。维护窗口内重新生成最终清单和计划：

```bash
./scripts/storage/migrate_objects.sh --env-file "$MIGRATION_ENV" copy --overwrite \
  --output "$RUN_DIR/final-objects.json"
./scripts/storage/migrate_metadata.sh --env-file "$MIGRATION_ENV" plan \
  --manifest "$RUN_DIR/final-objects.json" --output "$RUN_DIR/final-plan.json"
./scripts/storage/migrate_metadata.sh --env-file "$MIGRATION_ENV" apply \
  --plan "$RUN_DIR/final-plan.json" --writers-stopped
```

`apply` 在一个数据库事务内锁定并核对迁移相关记录，校验源/目标对象版本，然后仅更新计划
允许的存储字段。新增、删除或已变化的相关记录会导致整批拒绝；中途失败回滚整个事务。
标注、患者关联、描述等业务字段不会被覆盖，业务更新时间也保持不变。成功后重复执行
同一计划会返回 `already applied`，无需另建迁移状态表。

应用暂停期间同步切换 `storage-service` 的 S3 地址/凭据和 Nginx 图片代理上游。
当前仓库仍有 `minio:9000` 固定配置，需先完成配置接线；这两个脚本不会修改路由。
保持原外部域名、bucket 路径、Host 和签名查询参数。连接检查不等于用户完整验收。
先完成只读验收并刷新浏览器旧访问地址，再恢复用户和后台写入。

## 4. 验收失败时回退

在写入仍暂停、MinIO 源对象保持迁移时版本的阶段：

```bash
./scripts/storage/migrate_metadata.sh --env-file "$MIGRATION_ENV" rollback \
  --plan "$RUN_DIR/final-plan.json" --writers-stopped
```

脚本会检查数据库当前字段仍等于本次迁移后的值，确认 MinIO 原对象仍可用，再恢复迁移前的
存储字段及缩略图引用。已恢复时返回 `already rolled back`。它保留 RustFS 数据，不要求
故障中的 RustFS 仍可访问。然后在恢复入口前将存储服务和 Nginx 一起切回 MinIO，重新获取
访问地址。

回退只恢复这次迁移的存储字段，不能用它覆盖迁移后用户的有效修改。恢复写入后出现新记录、
对象替换、删除、缩略图回填等变化，回退会拒绝，需要另做反向同步和新的元数据对齐。
不要直接恢复旧整库备份来覆盖这段时间的其他业务更新，也不要执行生产 `down -v`。

## 实现依据

- [AWS SDK 流式传输](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/upload_fileobj.html)
- [S3 条件读取](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object.html)
- [SQLAlchemy 事务](https://docs.sqlalchemy.org/en/20/core/connections.html)
