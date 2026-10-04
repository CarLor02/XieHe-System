# RustFS 1.0.0 并行验证

Compose 列表包含独立的 `rustfs` 服务，镜像固定为 `rustfs/rustfs:1.0.0`。
本阶段仅用于手动复制样本、比较对象内容和 ETag；应用、Nginx 和 AI 取图链路仍连接
现有 MinIO，不修改数据库，也不自动复制对象或创建 bucket。

## 配置与启动

在已有部署的仓库根目录执行：

```bash
# 仅首次创建；保留已有 RustFS 凭据。
if [ ! -f dotenv/.env.rustfs ]; then
  (umask 077; cp dotenv/.env.rustfs.example dotenv/.env.rustfs)
fi
```

编辑 `dotenv/.env.rustfs`，将 `RUSTFS_SECRET_KEY` 占位符替换为独立随机密钥，
例如使用 `openssl rand -hex 32` 生成。该文件已由 `.gitignore` 排除。
Compose 封装现在会加载此文件，更新仓库后需要先准备好再执行 Compose 命令。
`deploy_pc.sh` 在生成配置时也会补建此文件，并保留已有文件；已有生产部署只需按本文
单独启动 RustFS，无需运行整套部署脚本。

默认端口如下，可在现有 `dotenv/.env.ports` 中追加同名变量覆盖，无需重置该文件：

```dotenv
RUSTFS_API_PORT_BIND=127.0.0.1:9100:9000
RUSTFS_CONSOLE_PORT_BIND=127.0.0.1:9101:9001
```

```bash
./scripts/compose.sh config --quiet
./scripts/compose.sh pull rustfs
./scripts/compose.sh up -d --no-deps rustfs
./scripts/compose.sh ps rustfs
curl --noproxy '*' --fail http://127.0.0.1:9100/health
```

只启动 `rustfs` 不会重建现有业务服务。普通 `./scripts/compose.sh up -d` 则会将
RustFS 和其他默认服务一起启动。

| 用途 | 地址或名称 |
| --- | --- |
| 宿主机上的 S3 客户端 | `http://127.0.0.1:9100` |
| 同一 Compose 网络中的 S3 客户端 | `http://rustfs:9000` |
| 宿主机控制台 | `http://127.0.0.1:9101` |
| 容器 | `medical_rustfs` |
| 数据卷 | `xiehe-system_rustfs_data`，挂载 `/data` |
| 日志卷 | `xiehe-system_rustfs_logs`，挂载 `/logs` |

卷名称以上述 Compose 默认项目名 `xiehe-system` 为准；自定义项目名时前缀相应变化。
新建命名卷继承镜像目录的 `10001:10001` 权限，不复用 `minio_data`。
普通容器重建会保留数据；不要对整个生产 Compose 执行 `down -v`。

从个人电脑访问服务器上的控制台，可以使用 SSH 转发：

```bash
ssh -N -L 9100:127.0.0.1:9100 -L 9101:127.0.0.1:9101 user@server
```

随后在个人电脑打开 `http://127.0.0.1:9101`，使用 `.env.rustfs` 中的凭据登录。

## 样本验证边界

先在 RustFS 创建测试 bucket，选择普通小图、通过分片上传的原图及 WebP 缩略图，
记录源对象的 bucket、key、大小、ETag、Content-Type 和自定义元数据，再进行复制。
复制后检查字节内容及元数据，并单独记录 ETag 是否相同。上传方式或分片大小变化可能
使 ETag 改变，即使文件字节完全一致。

本阶段不修改 `MINIO_*`、`STORAGE_SERVICE_URL`、Nginx 上游和数据库 ETag，
也不运行缩略图回填。保留源对象用于后续比较，等待样本结果再决定正式迁移方式。

正式迁移工具及 `plan / apply / rollback` 的维护窗口顺序见
[MinIO 到 RustFS 迁移](../migration/0008-minio-to-rustfs.md)。

## 参考

- [RustFS 1.0.0 发布](https://github.com/rustfs/rustfs/releases/tag/1.0.0)
- [官方容器部署说明](https://docs.rustfs.com/en/installation/container/docker)
- [1.0.0 镜像目录与用户定义](https://github.com/rustfs/rustfs/blob/1.0.0/Dockerfile)
