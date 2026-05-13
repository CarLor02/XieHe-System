# 文件索引服务（Communication）

扫描机部署的文件索引服务，用于自动扫描本地 DICOM/PNG/JPG 图像文件，提供 REST API 供主系统查询和拉取。

---

## 📋 功能特性

- ✅ **自动扫描**：定时递归扫描指定目录及所有子文件夹
- ✅ **多格式支持**：DICOM、PNG、JPG、JPEG、BMP、TIFF 等
- ✅ **黑边裁剪**：自动裁剪图像四周黑边，导入时无需手动调整
- ✅ **文件索引**：SQLite 数据库记录文件元数据、同步状态
- ✅ **REST API**：提供文件列表、预览图、下载、统计等接口
- ✅ **配置热更新**：支持运行时修改扫描路径和间隔

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
WATCH_PATH=/path/to/your/dicom/files
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

### 4. 停止服务

```bash
pkill -f "uvicorn main:app"
```

---

## 🪟 Windows 部署

详见 [README_Windows部署.md](./README_Windows部署.md)

**快速启动**：
1. 双击 `启动文件索引服务.bat`
2. 配置界面自动打开，设置扫描路径
3. 保存配置后重启服务

---

## 🔧 配置管理

### 方式一：配置文件

编辑 `file_index_service/.env`：

```ini
WATCH_PATH=/Users/yourname/Documents/dicom_files  # 扫描路径
SCAN_INTERVAL=300                                  # 扫描间隔（秒）
HOST=0.0.0.0                                       # 监听地址
PORT=9000                                          # 端口
API_KEY=                                           # API 密钥（留空不鉴权）
LOG_LEVEL=INFO                                     # 日志级别
```

### 方式二：图形界面

打开浏览器访问 `http://服务器IP:9000`，或双击 `config_manager.html`。

### 方式三：运行时 API

```bash
# 更新配置
curl -X POST http://localhost:9000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"WATCH_PATH": "/new/path", "SCAN_INTERVAL": 600}'

# 手动触发扫描
curl -X POST http://localhost:9000/api/v1/scan
```

---

## 📡 API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/v1/files` | GET | 文件列表（分页、过滤） |
| `/api/v1/files/{id}/preview-image` | GET | 预览图（PNG，自动裁剪黑边） |
| `/api/v1/files/{id}/download` | GET | 下载原始文件 |
| `/api/v1/files/{id}/inspect` | GET | 读取 DICOM 元数据 |
| `/api/v1/files/{id}/mark-synced` | POST | 标记已同步 |
| `/api/v1/stats` | GET | 统计信息 |
| `/api/v1/config` | GET/POST | 查看/更新配置 |
| `/api/v1/scan` | POST | 手动触发扫描 |

完整 API 文档：`http://服务器IP:9000/docs`

---

## 🗂️ 目录结构

```
communication/
├── file_index_service/          # 服务主目录
│   ├── main.py                  # FastAPI 应用入口
│   ├── config.py                # 配置管理
│   ├── database.py              # 数据库初始化
│   ├── models.py                # SQLAlchemy 模型
│   ├── scanner.py               # 文件扫描逻辑
│   ├── scheduler.py             # APScheduler 定时任务
│   ├── api/                     # API 路由
│   │   ├── files.py             # 文件相关接口
│   │   └── stats.py             # 统计接口
│   ├── .env                     # 配置文件（自动生成）
│   ├── file_index.db            # SQLite 数据库
│   └── requirements.txt         # Python 依赖
├── config_manager.html          # 配置管理界面
├── 启动文件索引服务.bat         # Windows 启动脚本
├── 停止文件索引服务.bat         # Windows 停止脚本
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
- 确认文件扩展名在支持列表内（`.dcm`, `.png`, `.jpg` 等）
- 手动触发扫描：`curl -X POST http://localhost:9000/api/v1/scan`

### 3. 图像导入报 500 错误

- 确保已安装 `Pillow`、`numpy`、`pydicom`
- 检查日志：`tail -f file_index_service/server.log`

### 4. 黑边裁剪效果不理想

编辑 `file_index_service/api/files.py`，调整阈值：
```python
img = _auto_crop_black_borders(img, threshold=10)  # 改为 5 或 15
```

---

## 📝 更新日志

- **v1.0.0**：初始版本，支持 DICOM/PNG/JPG 扫描和转换
- **v1.1.0**：新增自动黑边裁剪、递归子文件夹扫描
- **v1.2.0**：Windows 部署脚本、配置管理界面

---

## 📞 技术支持

遇到问题请查看日志文件 `file_index_service/server.log`，或提交 Issue。
