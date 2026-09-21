# Docker 持久化与本机备份

Docker volume 只提供持久化，不等于备份。本项目使用 restic 保存本机冷备快照，
每天北京时间 00:30 执行；不支持在业务持续写入时直接复制数据卷。

## 范围与边界

| 数据 | 是否备份 |
| --- | --- |
| MySQL 数据卷、业务数据库 SQL 导出 | 是 |
| MinIO 完整数据卷，含内部元数据 | 是 |
| Redis 状态实例的数据卷，含 RDB/AOF | 是 |
| Kafka 完整数据卷 | 是，不按 topic 排除日志消息 |
| 实际 dotenv、基础设施配置、镜像及卷映射清单 | 是，含敏感信息，随快照加密保存 |
| Redis 查询缓存、普通日志卷、logging-service 数据卷 | 否 |
| 模型数据卷、模型权重、Docker 镜像层 | 否，需另有可重建或保留来源 |

logging-service 不在本轮退役。备份 Kafka 时会暂停并恢复它，但不备份
`logging_service_data`。原本停止的 Worker 等服务不会因为备份被启动。

本机仓库主要防误删、错误更新和部署失误；同盘损坏、整机丢失、主机管理员误删或
入侵仍可能同时破坏原数据和备份。每日一次是 24 小时级恢复目标，执行耗时及失败
会使恢复点更旧，需要关注最后成功时间。

## 首次安装

在服务器的项目根目录执行，要求 Linux、systemd、本机 Docker Engine/Compose V2，
以及 Bash、jq、flock、timeout、openssl、Git 和基础 GNU 工具。不要使用远程 Docker
context，不要在备份期间并行部署、迁移数据库、删除卷或手工写入存储。

```bash
sudo ./scripts/backup/install_backup_timer.sh
```

安装器将：

- 创建 `/etc/xiehe-backup/backup.env` 和随机密码文件 `/etc/xiehe-backup/password`。
- 拉取固定版本 `restic/restic:0.19.1`，初始化 `/srv/xiehe-backups/repository`。
- 安装 `xiehe-backup.service` 和 `xiehe-backup.timer`，但不启用 timer、不启动备份。
- 重复安装时保留既有配置、密码、仓库和 timer 启用状态。

如果此前安装过旧路径的脚本，更新代码后需重新运行上述安装命令，以更新 systemd
unit 中的脚本路径；无需重新初始化密码或删除备份仓库。

密码应另存到可信的密码管理工具中。不能只把密码放在需要该密码才能解密的仓库内。
密码丢失无法恢复数据；安装器发现既有仓库缺失密码时会拒绝生成替代密码。

默认配置：

```bash
PROJECT_DIR=/服务器上的项目绝对路径
BACKUP_ROOT=/srv/xiehe-backups
RESTIC_PASSWORD_FILE=/etc/xiehe-backup/password
RESTIC_IMAGE=restic/restic:0.19.1
XIEHE_COMPOSE_SECURITY=0
CAPTURE_TIMEOUT_SECONDS=1200
RECOVERY_TIMEOUT_SECONDS=600
MAINTENANCE_TIMEOUT_SECONDS=300
```

配置是管理员拥有的 Bash 配置，文件权限须为 `600`，备份根目录须为 `700`。
需要自定义目录时先修改配置；不要把仓库放进项目目录或被备份的数据卷。
若部署使用了 `compose.sh --security`，将 `XIEHE_COMPOSE_SECURITY` 改为 `1`；
若使用自定义 Compose 项目名，在此配置 `COMPOSE_PROJECT_NAME`。

初始化 restic 仓库不需要停止业务。安装器不会安装系统软件包或修改宿主机时区。

## 先手动运行并测量耗时

这一步会暂停本项目服务，应在维护窗口执行：

```bash
sudo systemctl start xiehe-backup.service
sudo systemctl status xiehe-backup.service --no-pager
sudo journalctl -u xiehe-backup.service -n 100 --no-pager
sudo cat /srv/xiehe-backups/last-success.json
sudo ./scripts/backup/backup_database.sh snapshots
```

`systemctl start` 会等待本次执行结束。另开终端用
`sudo journalctl -fu xiehe-backup.service` 查看进度。日志记录预检查、SQL 导出、
冷备及服务恢复阶段；`last-success.json` 包含快照 ID、处理字节数、restic 耗时、
完成时间和 `downtime_seconds`。`last-run.json` 记录最近一次执行的退出码。

执行顺序为：预检查和加锁 → 记录原运行容器 → 停止入口及应用写入方 → 导出 SQL →
正常停止存储服务 → 只读备份完整卷 → 恢复原容器并检查健康状态 → 在线清理旧快照。
脚本不执行 `compose up`、镜像拉取、容器重建或 `down -v`。

预检查会要求可用空间至少达到当前源卷占用量加 2 GiB，保守地为首次写入或大量变化
留出空间；这不是长期容量保证。当前十几 GB 的数据建议先预留约 50 GB，再根据增长
和实际备份占用调整。后续快照会去重，不是每天再保存一份完整数据。

20 分钟捕获预算包含预检查、停服、SQL 导出和备份。超时将中止本次捕获，随后用
10 分钟预算尝试恢复服务。清理最多另外运行 5 分钟，此时服务已恢复。
30 分钟是维护预算，不是 Docker 故障、磁盘故障时一定能恢复的承诺。

restic 非零退出码（包括表示部分文件未读取的 `3`）不更新成功记录、不触发旧快照
清理。失败可能仍产生不完整快照，因此不要仅凭 `snapshots` 中出现记录或盲选
`latest` 判断成功；优先使用 `last-success.json` 中明确记录的快照 ID。

## 验证后启用定时

```bash
sudo systemctl enable --now xiehe-backup.timer
systemctl list-timers xiehe-backup.timer
systemd-analyze calendar '*-*-* 00:30:00 Asia/Shanghai'
```

`OnCalendar` 显式指定 `Asia/Shanghai`，即 UTC+8 的 00:30，不依赖服务器时区。
日志也设置 `TZ=Asia/Shanghai`。`Persistent=false` 表示服务器错过夜间任务后，
不会在白天开机时补跑停服备份；本次安装不修改服务器的时间同步设置。

暂停后续定时任务：

```bash
sudo systemctl disable --now xiehe-backup.timer
```

停止 timer 不会取消已经运行的备份。必须中断本次执行时，使用
`sudo systemctl stop xiehe-backup.service`，让脚本和 `ExecStopPost` 走服务恢复流程，
不要直接删除状态文件或对脚本使用 `kill -9`。

每次成功备份并恢复服务后保留 7 个日快照、4 个周快照、3 个月快照，再执行 prune。
按固定源路径和项目分组，避免每次使用时间戳目录导致保留策略失效。

## 失败处理

失败通过 systemd 状态、journal 和 `last-run.json` 暴露，本轮没有外部告警平台。
应定期确认 `last-success.json` 的时间没有超过预期。

脚本用互斥锁阻止备份、初始化、快照查询和服务恢复互相冲突。未完成操作的状态保留
在 `/srv/xiehe-backups/state/`，不会在下次备份时静默覆盖。

若服务恢复失败，先检查 Docker 和服务日志，解决原因后在项目根目录执行：

```bash
sudo ./scripts/backup/backup_database.sh recover-services
sudo ./scripts/compose.sh ps
```

恢复命令先清理本次残留的工具容器，再启动记录中的原容器，不启动之前停止的服务。
显式人工重试会重新获得 10 分钟恢复预算。不要手工删除状态来绕过未完成恢复。
仓库锁也不要盲目 `unlock`，先确认没有任何 restic 操作仍在运行。

## 快照导出与恢复说明

旧的 `scripts/backup/restore_database.sh` **只处理旧版 SQL/RDB 文件，不支持新的 restic
快照**。本轮不提供自动覆盖生产卷的恢复命令，也不执行真实恢复演练。

先将选定快照导出到独立目录，不接触生产卷。以下命令在 root shell 中执行；先停止
timer，并确认没有正在执行的备份或 prune：

```bash
sudo -i
source /etc/xiehe-backup/backup.env
systemctl stop xiehe-backup.timer
systemctl is-active xiehe-backup.service
# 确认上面不是 active/activating/deactivating 后再继续。
mkdir -m 700 -p /srv/xiehe-restore
SNAPSHOT_ID="$(jq -r .snapshot_id "$BACKUP_ROOT/last-success.json")"
docker run --rm --pull never --network none \
  --mount "type=bind,src=$BACKUP_ROOT/repository,dst=/repository" \
  --mount "type=bind,src=$RESTIC_PASSWORD_FILE,dst=/password,readonly" \
  --mount type=bind,src=/srv/xiehe-restore,dst=/restore \
  --env RESTIC_REPOSITORY=/repository \
  --env RESTIC_PASSWORD_FILE=/password \
  "$RESTIC_IMAGE" restore "$SNAPSHOT_ID" --target /restore
```

导出结果包含 `source/mysql`、`source/minio`、`source/redis`、`source/kafka` 和
`source/metadata`；metadata 中有 SQL、manifest、容器/卷/镜像清单及配置。
该目录包含解密后的业务数据和凭据，须保持权限限制，不再使用时及时清理。

手工恢复必须遵守以下边界：

1. 先在隔离环境创建新卷，按清单重建配置和镜像。固定 `container_name` 会冲突，
   不能仅换 Compose 项目名就认为与生产隔离；优先使用独立测试主机。
2. 物理恢复使用备份时的实际镜像版本及数据布局，不能直接拉取届时的 `latest`。
   镜像清单不包含镜像层；尤其 MinIO，需事先保留可用镜像或建立自己的镜像存档。
3. 在所有写入方停止时恢复四个卷，保持文件属主及权限，不混入原卷的剩余文件。
   MinIO 要恢复完整目录；Redis 不得只替换 RDB、却保留另一时间点的 AOF。
4. SQL 是业务库的额外逻辑导出，不是 MySQL 账号权限的独立导出；物理 MySQL 卷
   包含系统库。不要把 SQL 重新导入已完成的物理恢复中。
5. 验证影像读取、标注关联、对象元数据和后台任务状态。Redis 回滚可能重新带回
   已撤销的凭据，开放入口前需处理登录令牌失效和 API Key 复核。
6. 验证完成后再决定生产切换和重新启用 timer。不得先删除生产卷再试着恢复。

定期用 restic `check` 检查仓库，必要时增加 `--read-data` 检查实际数据；仓库校验
不能代替数据库启动、图片读取和业务关联的恢复演练。
