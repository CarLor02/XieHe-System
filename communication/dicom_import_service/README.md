# DICOM批量导入服务

这是一个**独立的**DICOM文件批量导入服务，用于将本地DICOM文件批量导入到XieHe医疗系统中。

## 功能特性

- ✅ **自动扫描目录** - 按月份/患者ID组织的目录结构
- ✅ **提取患者信息** - 从DICOM元数据中提取患者基本信息
- ✅ **DICOM转JPG** - 自动将DICOM格式转换为JPG格式（支持窗宽窗位调整）
- ✅ **智能去重** - 基于**患者ID + 图像名称**组合避免重复导入
- ✅ **自动创建患者** - 如果患者不存在，自动调用API创建患者记录
- ✅ **详细统计** - 提供导入进度、成功/失败数量、错误信息
- ✅ **异步处理** - 后台异步执行导入任务，不阻塞API

## 目录结构要求

DICOM文件需要按以下结构组织：

```
root_path/
├── 2024-01/              # 月份目录（格式：YYYY-MM）
│   ├── P001/             # 患者ID目录
│   │   ├── image1.dcm
│   │   ├── image2.dcm
│   │   └── ...
│   ├── P002/
│   │   └── ...
├── 2024-02/
│   └── ...
```

## 安装部署

### 1. 安装依赖

```bash
cd XieHe-System/communication/dicom_import_service
pip install -r requirements.txt
```

### 2. 配置环境变量

复制配置文件模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写实际配置：

```env
# XieHe后端API配置
BACKEND_URL=http://localhost:8000
API_TOKEN=your_api_token_here

# DICOM源目录
DICOM_SOURCE_PATH=/data/dicom

# JPG输出目录
OUTPUT_DIR=./output
```

### 3. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8001` 启动。

## API接口

### 1. 健康检查

```http
GET /health
```

**响应**：
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T14:30:22Z"
}
```

### 2. 启动导入任务

```http
POST /import
Content-Type: application/json

{
  "source_path": "/data/dicom/2024-01",
  "description": "2024年1月份影像导入"
}
```

**响应**：
```json
{
  "task_id": "dicom-import-20260208-143022-a1b2c3d4",
  "status": "pending",
  "message": "DICOM导入任务已启动，请通过状态查询接口获取进度",
  "started_at": "2026-02-08T14:30:22Z"
}
```

### 3. 查询任务状态

```http
GET /import/{task_id}/status
```

**响应**：
```json
{
  "task_id": "dicom-import-20260208-143022-a1b2c3d4",
  "status": "running",
  "source_path": "/data/dicom/2024-01",
  "description": "2024年1月份影像导入",
  "created_at": "2026-02-08T14:30:22Z",
  "started_at": "2026-02-08T14:30:25Z",
  "completed_at": null,
  "duration_seconds": null,
  "progress": {
    "total_files_scanned": 150,
    "total_patients_found": 50,
    "new_patients_created": 10,
    "existing_patients_skipped": 40,
    "new_images_uploaded": 120,
    "duplicate_images_skipped": 25,
    "failed_files": 5
  },
  "errors": []
}
```

### 4. 获取详细统计

```http
GET /import/{task_id}/stats
```

### 5. 获取任务列表

```http
GET /import/tasks
```

## 去重策略

系统使用 **患者ID + 图像名称** 的组合来判断图像是否已导入：

- 在上传每个图像前，调用后端API检查是否存在相同的 `patient_id` + `original_filename` 组合
- 如果存在，跳过该图像
- 这样可以避免重复导入相同的影像文件
- 支持增量导入（只导入新增的文件）

## 工作流程

```
1. 扫描月份目录 (YYYY-MM)
   ↓
2. 扫描患者目录 (patient_id)
   ↓
3. 读取DICOM文件，提取患者信息
   ↓
4. 检查患者是否存在
   ├─ 存在 → 使用现有患者
   └─ 不存在 → 调用API创建新患者
   ↓
5. 对每个DICOM文件：
   ├─ 检查是否重复（患者ID + 文件名）
   │  ├─ 重复 → 跳过
   │  └─ 不重复 → 继续
   ├─ 转换DICOM为JPG
   ├─ 调用API上传影像
   └─ 记录统计信息
```

## 文件说明

- `main.py` - FastAPI应用入口，定义API接口
- `config.py` - 服务配置
- `models.py` - 数据模型定义
- `dicom_processor.py` - DICOM文件处理（读取、转换）
- `api_client.py` - XieHe后端API客户端
- `import_service.py` - 导入服务主逻辑
- `requirements.txt` - Python依赖
- `.env.example` - 配置文件模板

## 注意事项

1. **API Token** - 需要配置有效的XieHe系统API token
2. **目录权限** - 确保服务有读取DICOM文件目录的权限
3. **存储空间** - JPG文件会存储在 `OUTPUT_DIR` 目录下
4. **性能考虑** - 大批量导入建议在非高峰时段进行
5. **任务状态** - 当前任务状态存储在内存中，服务重启后会丢失

## 使用示例

```bash
# 启动服务
python main.py

# 启动导入任务
curl -X POST "http://localhost:8001/import" \
  -H "Content-Type: application/json" \
  -d '{
    "source_path": "/data/dicom/2024-01",
    "description": "2024年1月份影像导入"
  }'

# 查询任务状态
curl "http://localhost:8001/import/{task_id}/status"
```

## 故障排查

### 问题1：pydicom库未安装
```bash
pip install pydicom
```

### 问题2：PIL或numpy库未安装
```bash
pip install Pillow numpy
```

### 问题3：API调用失败
- 检查 `BACKEND_URL` 配置是否正确
- 检查 `API_TOKEN` 是否有效
- 检查XieHe后端服务是否正常运行

## 未来改进

- [ ] 支持并发导入
- [ ] 添加导入进度实时推送（WebSocket）
- [ ] 支持更多图像格式
- [ ] 添加导入历史记录持久化
- [ ] 支持导入任务暂停/恢复

