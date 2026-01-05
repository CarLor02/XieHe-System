# 影像文件数据库管理功能

## 概述

新增 `image_files` 表用于统一管理所有上传的影像文件,支持通过用户信息查询而不是扫描本地文件夹。

## 数据库变更

### 新增表: `image_files`

记录所有上传的影像文件信息,包括:

**基本信息:**
- `id`: 文件ID (主键)
- `file_uuid`: 文件唯一标识
- `original_filename`: 原始文件名
- `file_type`: 文件类型 (DICOM/JPEG/PNG/TIFF/OTHER)
- `mime_type`: MIME类型

**存储信息:**
- `storage_path`: 文件存储路径(相对路径)
- `file_size`: 文件大小(字节)
- `file_hash`: MD5哈希值
- `thumbnail_path`: 缩略图路径

**关联信息:**
- `uploaded_by`: 上传用户ID (外键 -> users.id)
- `patient_id`: 关联患者ID (外键 -> patients.id)
- `study_id`: 关联检查ID (外键 -> studies.id)
- `series_id`: 关联序列ID (外键 -> series.id)

**影像元数据:**
- `modality`: 影像模态 (CT/MR/XR等)
- `body_part`: 身体部位
- `study_date`: 检查日期
- `description`: 文件描述

**状态信息:**
- `status`: 文件状态 (UPLOADING/UPLOADED/PROCESSING/PROCESSED/FAILED/ARCHIVED/DELETED)
- `upload_progress`: 上传进度 (0-100)

**分片上传支持:**
- `is_chunked`: 是否分片上传
- `total_chunks`: 总分片数
- `uploaded_chunks`: 已上传分片列表(JSON)

**时间戳:**
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `uploaded_at`: 上传完成时间
- `is_deleted`: 是否软删除
- `deleted_at`: 删除时间
- `deleted_by`: 删除人ID

## 新增API端点

### 1. 获取当前用户的影像文件
```
GET /api/v1/image-files/my-images
```

**查询参数:**
- `page`: 页码 (默认: 1)
- `page_size`: 每页数量 (默认: 20, 最大: 100)
- `file_type`: 文件类型筛选 (DICOM/JPEG/PNG/TIFF/OTHER)
- `status`: 状态筛选 (UPLOADING/UPLOADED/PROCESSING等)
- `modality`: 影像模态筛选 (CT/MR/XR等)
- `start_date`: 开始日期
- `end_date`: 结束日期
- `search`: 搜索关键词 (文件名)

**响应示例:**
```json
{
  "total": 150,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "file_uuid": "abc123...",
      "original_filename": "chest_xray.jpg",
      "file_type": "JPEG",
      "file_size": 1024000,
      "storage_path": "completed/chest_xray_20260105_143022.jpg",
      "uploaded_by": 5,
      "uploader_name": "张医生",
      "patient_id": 10,
      "modality": "XR",
      "status": "UPLOADED",
      "created_at": "2026-01-05T14:30:22"
    }
  ]
}
```

### 2. 获取患者的影像文件
```
GET /api/v1/image-files/patient/{patient_id}
```

### 3. 获取影像文件详情
```
GET /api/v1/image-files/{file_id}
```

### 4. 下载影像文件
```
GET /api/v1/image-files/{file_id}/download
```

### 5. 删除影像文件 (软删除)
```
DELETE /api/v1/image-files/{file_id}
```

### 6. 获取影像统计信息
```
GET /api/v1/image-files/stats/summary
```

**响应示例:**
```json
{
  "total_files": 150,
  "total_size": 5368709120,
  "by_type": {
    "DICOM": 80,
    "JPEG": 50,
    "PNG": 20
  },
  "by_status": {
    "UPLOADED": 140,
    "PROCESSING": 10
  },
  "by_modality": {
    "CT": 60,
    "MR": 40,
    "XR": 50
  }
}
```

## 代码改动

### 1. 新增模型
- `backend/app/models/image_file.py` - ImageFile 模型定义

### 2. 更新导出
- `backend/app/models/__init__.py` - 导出 ImageFile 相关类

### 3. 新增API
- `backend/app/api/v1/endpoints/image_files.py` - 影像文件管理API

### 4. 更新上传逻辑
- `backend/app/api/v1/endpoints/upload.py` 
  - 添加 `create_image_file_record()` 函数
  - 修改上传API,同时创建 ImageFile 记录

### 5. 注册路由
- `backend/app/api/v1/api.py` - 注册 image_files 路由

### 6. 数据库初始化脚本
- `backend/scripts/init_image_file_table.py` - 创建表脚本

## 部署步骤

### 1. 创建数据库表

在服务器上运行初始化脚本:

```bash
cd /root/XieHe-System/backend
python scripts/init_image_file_table.py
```

### 2. 重启后端服务

```bash
docker-compose restart backend
```

### 3. 验证API

```bash
# 获取当前用户的影像文件
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/image-files/my-images

# 获取统计信息
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/image-files/stats/summary
```

## 前端集成建议

### 1. 修改影像中心页面

**现有方式 (扫描文件夹):**
```typescript
// ❌ 旧方式
const loadLocalImages = async () => {
  const files = await scanDirectory('/uploads')
  setImages(files)
}
```

**新方式 (数据库查询):**
```typescript
// ✅ 新方式
const loadUserImages = async () => {
  const response = await fetch('/api/v1/image-files/my-images?page=1&page_size=20', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await response.json()
  setImages(data.items)
  setTotal(data.total)
}
```

### 2. 添加筛选功能

```typescript
const filterImages = async (filters) => {
  const params = new URLSearchParams({
    page: '1',
    page_size: '20',
    ...(filters.fileType && { file_type: filters.fileType }),
    ...(filters.modality && { modality: filters.modality }),
    ...(filters.startDate && { start_date: filters.startDate }),
    ...(filters.search && { search: filters.search })
  })
  
  const response = await fetch(`/api/v1/image-files/my-images?${params}`)
  const data = await response.json()
  setImages(data.items)
}
```

### 3. 显示统计信息

```typescript
const loadStats = async () => {
  const response = await fetch('/api/v1/image-files/stats/summary')
  const stats = await response.json()
  
  // 显示: 共150个文件, 总大小5GB, CT 60张, MR 40张...
}
```

## 优势

1. **性能优化**: 数据库索引查询比文件系统扫描快得多
2. **多条件筛选**: 支持按用户、患者、日期、类型等多维度筛选
3. **权限控制**: 每个用户只能看到自己上传的文件
4. **统计分析**: 方便统计文件数量、大小、类型分布等
5. **可扩展性**: 后续可以添加更多元数据字段
6. **数据完整性**: 外键约束保证数据关联正确

## 注意事项

1. 已上传的旧文件不会自动导入到数据库,只有新上传的文件才会记录
2. 软删除机制保证文件不会真正从磁盘删除
3. 需要定期清理 `is_deleted=true` 的文件以释放磁盘空间
4. 建议前端缓存文件列表,避免频繁请求

## 后续优化建议

1. 添加缩略图生成功能
2. 支持批量上传并记录
3. 添加文件去重检测 (基于 file_hash)
4. 实现文件归档功能
5. 添加文件访问日志
