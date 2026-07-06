# 脊柱分析服务——侧面（lat）

基于 FastAPI + YOLO 的侧面脊柱 X 光片分析服务，运行于端口 **8002**。

## 🎯 推理流程

1. 调用模型检测椎体角点 + 股骨头位置
2. 生成各指标的测量点（关键点 JSON）
3. 根据关键点计算所有指标

## 🔢 支持的指标

| 指标 | 说明 |
|---|---|
| T1 Slope | T1 倾斜角 |
| Cervical Lordosis | 颈椎前凸角 |
| Thoracic Kyphosis T2-T5 | 上胸椎后凸角 |
| Thoracic Kyphosis T5-T12 | 主胸椎后凸角 |
| Lumbar Lordosis | 腰椎前凸角 |
| SVA | 矢状面垂直轴 |
| TPA | T1 骨盆角 |
| PI | 骨盆入射角 |
| PT | 骨盆倾斜角 |
| SS | 骶骨倾斜角 |

## 📁 目录结构

```
model/lat/
├── app.py                    # FastAPI 应用
├── config.py                 # 配置（端口等）
├── models.py                 # 数据模型
├── inference_service.py      # 模型推理
├── keypoints_service.py      # 生成测量点 JSON
├── Dockerfile                # 容器构建
├── requirements.txt          # Python 依赖
├── models/                   # 模型权重文件
│   ├── corner_model.pt       # Corner 检测模型（YOLO11 Pose）
│   └── cfh_model.pt          # CFH 检测模型（YOLO11 Detection）
└── example/
    └── test_metrics.py       # 测试脚本
```

## 🚀 快速开始

### 1. 权重文件

权重文件**不在 Git 仓库中**，从 GitHub Releases 下载：

```bash
cd XieHe-System/model/lat
mkdir -p models

# 替换 <TAG> 为实际版本号
curl -L "https://github.com/CarLor02/XieHe-System/releases/download/<TAG>/corner_model.pt" \
     -o models/corner_model.pt
curl -L "https://github.com/CarLor02/XieHe-System/releases/download/<TAG>/cfh_model.pt" \
     -o models/cfh_model.pt
```

### 2. Docker 部署（推荐）

**前提**: 权重文件已下载到 `models/` 目录。

```bash
# 在 XieHe-System 目录执行
docker build -t xiehe-ai-lat:local model/lat/
docker run -d --name xiehe-ai-lat -p 8002:8002 xiehe-ai-lat:local

# 验证
curl http://localhost:8002/health
```

### 3. 直接运行（开发调试）

```bash
cd XieHe-System/model/lat
pip install -r requirements.txt
python3 app.py
```

服务地址：
- **API**: http://localhost:8002
- **Swagger 文档**: http://localhost:8002/docs
- **健康检查**: http://localhost:8002/health

## 📡 API 接口

### 健康检查

```
GET /health
```

### 文件上传模式

| 端点 | 说明 |
|---|---|
| `POST /api/detect` | 检测椎体角点 + 股骨头（步骤 1）|
| `POST /api/detect_and_keypoints` | 检测 + 生成测量点 JSON（步骤 2，推荐）|
| `POST /api/calculate_metrics` | 根据关键点 JSON 计算指标（步骤 3）|

**示例（步骤 2）:**
```bash
curl -X POST http://localhost:8002/api/detect_and_keypoints \
     -F "file=@lateral_spine.jpg"
```

### 对象模式（生产接口，后端直接调用）

后端通过此接口调用，图片由服务从 MinIO/storage-service 自动获取。

| 端点 | 说明 |
|---|---|
| `POST /api/detect_object` | 文件对象检测 |
| `POST /api/measurement` | 文件对象检测 + 测量点（生产主接口）|

**请求体 (JSON):**
```json
{
  "bucket": "medical-image-files",
  "object_key": "images/abc123.jpg"
}
```

## 📞 故障排查

### 模型文件不存在

```bash
ls -lh models/
# 应看到: corner_model.pt (~19MB), cfh_model.pt (~39MB)
```

若不存在，按上方"权重文件"节重新下载。

### 端口冲突

修改 `config.py`:
```python
PORT = 8003  # 改为其他端口
```

### 依赖缺失

```bash
pip install -r requirements.txt
```