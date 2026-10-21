# 前后端镜像构建排查

构建命令：

```bash
./scripts/compose.sh build frontend backend
```

此命令只构建镜像；验证构建不需要启动服务、执行数据库迁移或删除缓存/卷。

## `apk add` 报 `Unable to open log: Permission denied`

2026-10-21 在前端 builder 阶段复现该错误，退出码为 99。宿主机的
`node:22-alpine` 标签实际指向带有其他项目 Compose/Caddy 标签的镜像：
默认用户为 `65532:65532`，包含 Caddy，缺少 `node` 和 `npm`。构建继承该用户后，
`apk` 无权写入 root 所有的 `/var/log/apk.log`。仅提升权限仍无法提供缺失的 Node 工具。

只读检查本地镜像：

```bash
docker image inspect node:22-alpine \
  --format 'digests={{json .RepoDigests}} user={{json .Config.User}} labels={{json .Config.Labels}}'
docker run --rm --entrypoint /bin/sh node:22-alpine \
  -c 'id; command -v node; command -v npm; command -v caddy'
docker buildx imagetools inspect docker.io/library/node:22-alpine
```

重新拉取官方镜像可修复本地标签，不影响已经运行的容器：

```bash
docker pull docker.io/library/node:22-alpine
./scripts/compose.sh build frontend backend
```

前端 Dockerfile 现固定经过核对的官方多架构清单 digest，构建不会再把同名的本地
业务产物当作 Node 基础镜像。升级时应从官方仓库核对并更新 digest，再验证
`node --version`、`npm --version` 和完整构建。不要把业务产物标记为官方基础镜像名。

本次已确认错误标签的内容和官方清单不同；未定位到最初覆盖该标签的操作记录，
不据此推断覆盖者或操作方式。
