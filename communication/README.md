# 文件索引服务（Communication）

部署在扫描机端的文件索引服务，自动扫描本地图像文件，提供 REST API 供主系统查询、预览、下载并标记同步状态。

---

## 📋 功能特性

- ✅ **自动扫描**：定时递归扫描指定目录及所有子文件夹
- ✅ **白名单过滤**：通过 `ALLOWED_EXTENSIONS` 限定扫描的图像格式（默认仅 `.png`）
- ✅ **增量索引**：新文件入库、已有文件更新元数据、消失文件标记无效
- ✅ **文件索引**：SQLite 数据库记录文件元数据、同步状态
- ✅ **REST API**：提供文件列表、预览图、下载、同步标记、统计等接口
- ✅ **配置热更新**：支持运行时修改扫描路径和间隔（写入 `.env`，重启生效）

---

## 🚀 Linux/macOS 部署

### 1. 安装依赖

```bash
cd communication/file_index_service
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件（首次运行会自动生成）：

```bash
HOST=0.0.0.0
PORT=9000
WATCH_PATH=/path/to/your/image/files
ALLOWED_EXTENSIONS=.png
SCAN_INTERVAL=300
DEBUG=false
```

### 3. 启动服务

**开发模式**（自动重载）：
```bash
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

**生产模式**（后台运行）：
```bash
nohup uvicorn main:app --host 0.0.0.0 --port 9000 > server.log 2>&1 &
```

也可直接运行入口：
```bash
python main.py
```

### 4. 停止服务

```bash
pkill -f "uvicorn main:app"
```

---

## 🪟 Windows 部署

详见 [README_Windows部署.md](./README_Windows部署.md)。

进入 `file_index_service` 目录后执行：

```bat
python main.py
```

---

## 🔧 配置管理

### 方式一：配置文件

编辑 `file_index_service/.env`：

```ini
WATCH_PATH=/Users/yourname/Documents/image_files  # 扫描路径
ALLOWED_EXTENSIONS=.png                            # 允许扫描的扩展名（逗号分隔，留空表示不限）
SKIP_EXTENSIONS=.sml,.db,.log,.txt,.json,.xml,.csv # 跳过的扩展名
SCAN_INTERVAL=300                                  # 扫描间隔（秒）
HOST=0.0.0.0                                       # 监听地址
PORT=9000                                          # 端口
API_KEY=                                           # API 密钥（留空不鉴权）
LOG_LEVEL=INFO                                     # 日志级别
```

> `ALLOWED_EXTENSIONS` 为白名单，配置后只扫描这些扩展名的文件；留空则恢复为扫描所有非跳过文件。后续要支持更多格式（如 `.jpg`、`.dcm`）只需修改此配置，无需改代码。

### 方式二：图形界面

打开浏览器访问 `http://服务器IP:9000`，或双击 `config_manager.html`。

### 方式三：运行时 API

```bash
# 更新配置（写入 .env，需重启生效）
curl -X POST http://localhost:9000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"watch_path": "/new/path", "scan_interval": 600}'

# 手动触发扫描
curl -X POST http://localhost:9000/api/v1/scan
```

---

## 📡 API 接口

> 除 `/health`、`/` 外，其余接口在配置了 `API_KEY` 时需在 Header 携带 `X-API-Key`。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查（无需鉴权） |
| `/` | GET | 服务信息（无需鉴权） |
| `/api/v1/patients` | GET | 患者文件夹汇总列表 |
| `/api/v1/files` | GET | 文件列表（分页、过滤） |
| `/api/v1/files/{id}` | GET | 单文件详情 |
| `/api/v1/files/{id}/inspect` | GET | 读取 DICOM 元数据 |
| `/api/v1/files/{id}/preview-image` | GET | 预览图（JPEG，保留原始分辨率，不裁剪） |
| `/api/v1/files/{id}/download` | GET | 下载原始文件 |
| `/api/v1/files/{id}/mark-synced` | POST | 标记单文件已同步 |
| `/api/v1/files/batch-mark-synced` | POST | 批量标记已同步 |
| `/api/v1/files/{id}/clear-synced` | POST | 清除单文件同步状态 |
| `/api/v1/files/batch-clear-synced` | POST | 批量清除同步状态 |
| `/api/v1/scan` | POST | 手动触发扫描 |
| `/api/v1/stats` | GET | 统计信息 |
| `/api/v1/config` | GET/POST | 查看/更新配置 |

完整 API 文档：`http://服务器IP:9000/docs`

---

## 🗂️ 目录结构

```
communication/
├── file_index_service/          # 服务主目录
│   ├── main.py                  # FastAPI 应用入口
│   ├── config.py                # 配置管理（含 ALLOWED_EXTENSIONS 白名单）
│   ├── database.py              # 数据库初始化
│   ├── models.py                # SQLAlchemy 模型
│   ├── scanner.py               # 文件扫描逻辑（白名单 + 跳过列表）
│   ├── scheduler.py             # APScheduler 定时任务
│   ├── api/                     # API 路由
│   │   ├── files.py             # 文件相关接口
│   │   └── stats.py             # 统计 & 配置接口
│   ├── .env                     # 配置文件（自动生成）
│   ├── file_index.db            # SQLite 数据库
│   └── requirements.txt         # Python 依赖
├── config_manager.html          # 配置管理界面
├── data/                        # 扫描目录示例
└── README_Windows部署.md        # Windows 部署文档
```

---

## 🛠️ 常见问题

### 1. 服务启动失败

**检查端口占用**：
```bash
lsof -i :9000
```

**查看日志**：
```bash
tail -f file_index_service/server.log
```

### 2. 文件扫描不到

- 检查 `WATCH_PATH` 是否正确（绝对路径）
- 确认文件扩展名在 `ALLOWED_EXTENSIONS` 白名单内（默认仅 `.png`）
- 确认扩展名不在 `SKIP_EXTENSIONS` 跳过列表内
- 手动触发扫描：`curl -X POST http://localhost:9000/api/v1/scan`

### 3. 预览图 / DICOM 解析报 500 错误

- 预览图依赖 `Pillow`、`numpy`；DICOM 解析依赖 `pydicom`
- 检查日志：`tail -f file_index_service/server.log`

---

## 📝 更新日志

- **v1.0.0**：初始版本，支持 DICOM/PNG/JPG 扫描和转换
- **v1.1.0**：新增递归子文件夹扫描
- **v1.2.0**：Windows 部署文档、配置管理界面
- **v1.3.0**：引入 `ALLOWED_EXTENSIONS` 扩展名白名单（默认仅 `.png`）；移除黑边裁剪逻辑，预览图保留原始分辨率；清理失效的 Windows 启动脚本

---

## 📞 技术支持

遇到问题请查看日志文件 `file_index_service/server.log`，或提交 Issue。
