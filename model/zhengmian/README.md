# Spine Analysis API

脊柱X光片分析后端服务，基于 YOLO 模型检测躯干标志点和椎体角点，输出前端交互系统需要的 JSON 格式。

## 目录结构

```
3-inference/
├── app.py              # FastAPI 服务主文件
├── requirements.txt    # Python 依赖
├── README.md           # 本文件
└── weights/
    ├── pose.pt         # 躯干标志点检测模型 (6个关键点)
    └── pose_corner.pt  # 椎体角点检测模型 (18类椎体，每个4角点)
```

## 快速开始

### 1. 安装依赖

```bash
cd 3-inference
pip install -r requirements.txt
```

### 2. 启动服务

```bash
# 方式1: 直接运行
python app.py

# 方式2: 使用 uvicorn (支持热重载)
uvicorn app:app --reload --host 0.0.0.0 --port 8888
```

服务启动后访问: http://localhost:8000

### 3. API 文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API 接口

### 健康检查

```bash
GET /health
```

**响应:**
```json
{
  "status": "ok",
  "pose_model": true,
  "pose_corner_model": true
}
```

### 1. 图片推理（计算指标）

```bash
POST /predict
```

**请求:**
```bash
curl -X POST http://localhost:8000/predict \
     -F "file=@spine_xray.jpg" \
     -F "image_id=IMG018"
```

**响应 (前端交互系统格式):**
```json
{
  "imageId": "IMG018",
  "imageWidth": 1920,
  "imageHeight": 2560,
  "measurements": [
    {
      "type": "T1 Tilt",
      "points": [{"x": 1.78, "y": 170.79}, {"x": 61.54, "y": 202.90}]
    },
    {
      "type": "Cobb-Thoracic",
      "angle": 25.3,
      "upper_vertebra": "T5",
      "lower_vertebra": "T11",
      "points": [
        {"x": -3.57, "y": 98.55}, {"x": 73.13, "y": 105.69},
        {"x": 0.89, "y": 72.69}, {"x": 71.35, "y": 54.85}
      ]
    },
    {
      "type": "Cobb-Lumbar",
      "angle": -15.7,
      "upper_vertebra": "L1",
      "lower_vertebra": "L4",
      "points": [
        {"x": -3.57, "y": 98.55}, {"x": 73.13, "y": 105.69},
        {"x": 0.89, "y": 72.69}, {"x": 71.35, "y": 54.85}
      ]
    },
    {
      "type": "CA",
      "points": [{"x": 8.03, "y": 28.09}, {"x": 76.70, "y": 9.36}]
    },
    {
      "type": "Pelvic",
      "points": [{"x": 6.24, "y": -85.17}, {"x": -52.62, "y": -61.09}]
    },
    {
      "type": "Sacral",
      "points": [{"x": 16.05, "y": -142.25}, {"x": 9.81, "y": -111.04}]
    },
    {
      "type": "AVT",
      "points": [{"x": -18.73, "y": -177.04}, {"x": 12.91, "y": -177.04}]
    },
    {
      "type": "TS",
      "points": [{"x": -106.13, "y": 107.47}, {"x": 12.91, "y": 107.47}]
    }
  ]
}
```

### 2. 检测关键点（原始数据）

```bash
POST /detect_keypoints
```

**请求:**
```bash
curl -X POST http://localhost:8000/detect_keypoints \
     -F "file=@spine_xray.jpg" \
     -F "image_id=IMG018"
```

**响应 (所有检测到的点):**
```json
{
  "imageId": "IMG018",
  "imageWidth": 1920,
  "imageHeight": 2560,
  "pose_keypoints": {
    "CR": {"x": 555.5, "y": 472.1, "confidence": 0.95},
    "CL": {"x": 1135.1, "y": 464.5, "confidence": 0.93},
    "IR": {"x": 588.7, "y": 1561.2, "confidence": 0.91},
    "IL": {"x": 1078.3, "y": 1558.0, "confidence": 0.89},
    "SR": {"x": 766.9, "y": 1621.1, "confidence": 0.87},
    "SL": {"x": 894.0, "y": 1624.0, "confidence": 0.85}
  },
  "vertebrae": {
    "C7": {
      "corners": {
        "top_left": {"x": 780.5, "y": 340.2, "conf": 0.92},
        "top_right": {"x": 920.3, "y": 338.5, "conf": 0.91},
        "bottom_left": {"x": 782.1, "y": 375.8, "conf": 0.90},
        "bottom_right": {"x": 918.7, "y": 374.2, "conf": 0.89},
        "top_mid": {"x": 850.4, "y": 339.35},
        "bottom_mid": {"x": 850.4, "y": 375.0},
        "center": {"x": 850.4, "y": 357.2}
      },
      "confidence": 0.93,
      "class_id": 0
    },
    "T1": {
      "corners": {
        "top_left": {"x": 800.7, "y": 390.8, "conf": 0.94},
        "top_right": {"x": 906.0, "y": 389.9, "conf": 0.93},
        "bottom_left": {"x": 802.3, "y": 425.5, "conf": 0.92},
        "bottom_right": {"x": 904.4, "y": 424.6, "conf": 0.91},
        "top_mid": {"x": 853.35, "y": 390.35},
        "bottom_mid": {"x": 853.35, "y": 425.05},
        "center": {"x": 853.35, "y": 407.7}
      },
      "confidence": 0.95,
      "class_id": 1
    }
  }
}
```

**说明:**
- `pose_keypoints`: 6个躯干关键点 (CR, CL, IR, IL, SR, SL)
- `vertebrae`: 检测到的所有椎骨 (C7, T1-T12, L1-L5)
  - 每个椎骨包含4个角点 + 3个计算点（上中点、下中点、中心）
  - 包含置信度和class_id

## 指标说明

| type | 中文名 | 点位说明 | 备注 |
|------|--------|----------|------|
| `T1 Tilt` | T1倾斜角 | T1上终板左右端点 | - |
| `Cobb-Thoracic` | 胸弯Cobb角 | 上端椎**下边缘** + 下端椎**上边缘** (4点) | T2-T11/T12范围，>10°才返回 |
| `Cobb-Thoracolumbar` | 胸腰弯Cobb角 | 上端椎**下边缘** + 下端椎**上边缘** (4点) | T2-L1范围，>10°才返回 |
| `Cobb-Lumbar` | 腰弯Cobb角 | 上端椎**下边缘** + 下端椎**上边缘** (4点) | L1/L2-L4范围，>10°才返回 |
| `CA` | 两肩倾斜角 | 左右锁骨最高点 (CR, CL) | - |
| `Pelvic` | 骨盆倾斜角 | 左右髂骨最高点 (IR, IL) | - |
| `Sacral` | 骶骨倾斜角 | 骶一上终板左右缘点 (SR, SL) | - |
| `AVT` | 顶椎偏移 | 顶椎中心 → CSVL | - |
| `TS` | 躯干偏移 | C7中心 → CSVL | - |

**Cobb角说明:**
- 自动在3个区域（胸弯、胸腰弯、腰弯）分别查找最大Cobb角
- 上端椎选择倾斜角最大的椎体，使用**下边缘**
- 下端椎选择倾斜角最小的椎体，使用**上边缘**
- 角度正负：左边高为正，右边高为负
- 只返回绝对值 > 10° 的Cobb角

## 模型信息

| 模型 | 文件 | 输出 |
|------|------|------|
| Pose | `weights/pose.pt` | 6个躯干关键点: CR, CL, IR, IL, SR, SL |
| Pose Corner | `weights/pose_corner.pt` | 18类椎体，每个4角点: TL, TR, BR, BL |

**椎体标注映射:**
- Class 0: C7
- Class 1-12: T1-T12
- Class 13-17: L1-L5

## Docker 部署 (可选)

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t spine-api .
docker run -p 8000:8000 spine-api
```

