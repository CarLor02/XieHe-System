# 模型服务共享环境

AP、LAT 和 shared 共用 Python 3.12、uv 0.12.10 及一份依赖锁文件。当前部署目标为 Linux x86_64 CPU；PyTorch 和 torchvision 显式从官方 CPU 索引安装。业务后端仍使用自己的环境。

## 安装与启动

宿主机先安装 uv 0.12.10；uv 会按版本文件选择或下载 Python 3.12。从仓库根目录执行：

```bash
uv sync --project model --locked --no-dev
```

HTTP 服务需要通过 Uvicorn 启动，在模型目录执行：

```bash
cd model
uv run --locked --no-dev uvicorn ap.interfaces.http.app:app --host 0.0.0.0 --port 8001
# LAT 使用 lat.interfaces.http.app:app，端口 8002。
```

请求影像所需的存储配置见 [宿主机部署指南](AI_HOST_DEPLOYMENT.md)。后台启动继续使用各服务的 `start_host.sh`，LAT 前台启动可使用 `lat/start_server.sh`。这些入口统一同步并使用 `model/.venv`，不再读取 `PYTHON_BIN`、`UVICORN_BIN` 或历史 Conda 环境。旧服务目录下的虚拟环境不再使用，无需搬迁。

## 依赖维护

- `pyproject.toml` 声明直接依赖，`uv.lock` 固定完整依赖及来源，二者一起提交。
- 修改依赖后运行 `uv lock --project model`；安装和部署使用 `--locked`，拒绝清单与锁文件不一致的状态。
- 不再维护 `requirements.txt` 或通过 pip 安装模型依赖。
- PyTorch 保持 CPU 版本；不要把 CPU 索引配置成所有依赖的默认源。

## 镜像构建与部署

从仓库根目录执行：

```bash
docker build -f model/ap/Dockerfile -t xiehe-ai-ap:local model
docker build -f model/lat/Dockerfile -t xiehe-ai-lat:local model
```

镜像使用 Python 3.12 Bookworm 和固定版本 uv，共享锁定依赖层，但仅复制对应服务和 shared。运行时使用镜像内的虚拟环境，不再下载或同步依赖。

两个 `deploy.sh` 仍读取各自的 `.env.build`。脚本先构建，再替换容器；构建失败时旧容器保留。替换后最多等待 120 秒，只有 Docker 健康检查通过才报告成功；退出、重启或超时都会打印日志并失败。旧镜像不主动删除，但脚本不自动回滚容器。

AP 的 tar 镜像部署入口要求镜像包含健康检查，并复用相同就绪判定。

镜像构建通过仅证明环境和文件可构建，模型权重加载、预测结果及前端流程仍需业务验收。
