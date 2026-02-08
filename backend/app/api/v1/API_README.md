# 脊柱X光分析系统 - 后端API接口文档

## 📋 目录
- [服务信息](#服务信息)
- [认证说明](#认证说明)
- [响应格式](#响应格式)
- [错误码参考](#错误码参考)
- [接口分类](#接口分类)
- [API详细说明](#api详细说明)
- [数据模型](#数据模型)
- [错误处理](#错误处理)
- [调用示例](#调用示例)
- [注意事项](#注意事项)
- [附录](#附录)
- [更新日志](#更新日志)

---

## 服务信息

### 基础信息
- **基础URL**: `http://localhost:8000/api/v1`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API版本**: v1

### 技术栈
- **框架**: FastAPI
- **数据库**: MySQL
- **缓存**: Redis
- **认证**: JWT (JSON Web Token)
- **文件存储**: 本地存储 / 云存储

### 启动服务

**开发环境**:
```bash
cd XieHe-System/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**生产环境**:
```bash
cd XieHe-System/backend
gunicorn app.main:app -c gunicorn.conf.py
```

**Docker部署**:
```bash
cd XieHe-System
docker-compose up -d
```

---

## 认证说明

### 认证方式
系统使用 **JWT (JSON Web Token)** 进行身份认证。

### 获取Token
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password",
  "remember_me": false
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "doctor_zhang",
      "full_name": "张医生",
      "email": "zhang@hospital.com",
      "role": "doctor"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 1800
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

### 使用Token
在所有需要认证的请求中，添加 Authorization 头：

```http
Authorization: Bearer <access_token>
```

### Token刷新
当 access_token 过期时，使用 refresh_token 获取新的 token：

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

---

## 响应格式

系统所有API接口均采用统一的响应格式，包括成功响应、分页响应和错误响应。

### 标准成功响应

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 实际响应数据
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**字段说明**:
- `code` (int): HTTP状态码，表示请求结果（200表示成功）
- `message` (string): 中文描述信息，说明操作结果
- `data` (object): 实际返回的业务数据
- `timestamp` (string): 响应时间戳，ISO 8601格式

### 分页响应格式

对于返回列表数据的接口，使用分页响应格式：

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      // 数据项数组
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 20,
      "total_pages": 5
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**分页字段说明**:
- `items` (array): 当前页的数据项列表
- `pagination.total` (int): 总记录数
- `pagination.page` (int): 当前页码（从1开始）
- `pagination.page_size` (int): 每页记录数
- `pagination.total_pages` (int): 总页数

### 错误响应格式

当请求失败时，返回错误响应：

```json
{
  "code": 400,
  "message": "请求参数错误",
  "error_code": "INVALID_REQUEST",
  "path": "/api/v1/patients/",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**错误字段说明**:
- `code` (int): HTTP状态码（4xx客户端错误，5xx服务器错误）
- `message` (string): 中文错误描述
- `error_code` (string): 错误码，用于程序化处理（可选）
- `path` (string): 请求路径（可选）
- `timestamp` (string): 错误发生时间

---

## 错误码参考

系统定义了标准化的错误码，用于精确识别错误类型。

### 1xxx - 通用错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `SUCCESS` | 200 | 操作成功 |
| `UNKNOWN_ERROR` | 500 | 未知错误 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `INVALID_REQUEST` | 400 | 无效的请求 |
| `OPERATION_FAILED` | 400 | 操作失败 |

### 2xxx - 认证授权错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `AUTH_FAILED` | 401 | 认证失败 |
| `AUTH_CREDENTIALS_INVALID` | 401 | 用户名或密码错误 |
| `AUTH_TOKEN_INVALID` | 401 | 令牌无效 |
| `AUTH_TOKEN_EXPIRED` | 401 | 令牌已过期 |
| `AUTH_TOKEN_MISSING` | 401 | 缺少认证令牌 |
| `PERMISSION_DENIED` | 403 | 权限不足 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足，无法执行此操作 |

### 3xxx - 业务错误

#### 用户相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `USER_ALREADY_EXISTS` | 409 | 用户已存在 |
| `USER_INACTIVE` | 403 | 用户未激活 |
| `USER_LOCKED` | 403 | 用户已被锁定 |
| `USERNAME_TAKEN` | 409 | 用户名已被使用 |
| `EMAIL_TAKEN` | 409 | 邮箱已被使用 |
| `PASSWORD_INCORRECT` | 401 | 密码错误 |
| `PASSWORD_TOO_WEAK` | 400 | 密码强度不足 |

#### 患者相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `PATIENT_NOT_FOUND` | 404 | 患者不存在 |
| `PATIENT_ALREADY_EXISTS` | 409 | 患者已存在 |
| `PATIENT_ID_NUMBER_EXISTS` | 409 | 身份证号已存在 |

#### 影像相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `IMAGE_NOT_FOUND` | 404 | 影像不存在 |
| `IMAGE_UPLOAD_FAILED` | 500 | 影像上传失败 |
| `IMAGE_PROCESSING_FAILED` | 500 | 影像处理失败 |
| `IMAGE_FORMAT_INVALID` | 400 | 影像格式不支持 |
| `IMAGE_SIZE_EXCEEDED` | 413 | 影像文件过大 |

#### 报告相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `REPORT_NOT_FOUND` | 404 | 报告不存在 |
| `REPORT_GENERATION_FAILED` | 500 | 报告生成失败 |
| `REPORT_ALREADY_EXISTS` | 409 | 报告已存在 |

#### 标注相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `ANNOTATION_NOT_FOUND` | 404 | 标注不存在 |
| `ANNOTATION_INVALID` | 400 | 标注数据无效 |

#### AI诊断相关

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `AI_DIAGNOSIS_FAILED` | 500 | AI诊断失败 |
| `AI_MODEL_NOT_AVAILABLE` | 503 | AI模型不可用 |
| `AI_PROCESSING_TIMEOUT` | 504 | AI处理超时 |

### 4xxx - 数据验证错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `VALIDATION_ERROR` | 422 | 数据验证失败 |
| `VALIDATION_EMAIL_INVALID` | 422 | 邮箱格式不正确 |
| `VALIDATION_PHONE_INVALID` | 422 | 手机号格式不正确 |
| `VALIDATION_ID_NUMBER_INVALID` | 422 | 身份证号格式不正确 |
| `VALIDATION_DATE_INVALID` | 422 | 日期格式不正确 |
| `VALIDATION_REQUIRED_FIELD_MISSING` | 422 | 必填字段缺失 |

### 5xxx - 系统错误

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INTERNAL_ERROR` | 500 | 系统内部错误 |
| `DATABASE_ERROR` | 500 | 数据库错误 |
| `DATABASE_CONNECTION_FAILED` | 503 | 数据库连接失败 |
| `FILE_SYSTEM_ERROR` | 500 | 文件系统错误 |
| `EXTERNAL_SERVICE_ERROR` | 502 | 外部服务错误 |
| `CONFIGURATION_ERROR` | 500 | 配置错误 |

---

## 接口分类

系统API按功能模块分为以下类别：

| 模块 | 前缀 | 说明 | 需要认证 |
|------|------|------|----------|
| 认证管理 | `/auth` | 登录、注册、令牌管理 | 部分 |
| 用户管理 | `/users` | 用户CRUD、权限管理 | ✓ |
| 权限管理 | `/permissions` | 角色权限配置 | ✓ |
| 患者管理 | `/patients` | 患者信息管理 | ✓ |
| 文件上传 | `/upload` | 影像文件上传 | ✓ |
| 影像标注 | `/measurements` | 测量数据管理 | ✓ |
| 影像文件管理 | `/image-files` | 影像文件CRUD | ✓ |
| 报告管理 | `/reports` | 诊断报告管理 | ✓ |
| 报告生成 | `/report-generation` | 自动报告生成 | ✓ |
| AI辅助诊断 | `/ai-diagnosis` | AI模型分析 | ✓ |
| 模型管理 | `/models` | AI模型配置 | ✓ |
| 系统管理 | `/system` | 系统配置、日志 | ✓ |
| WebSocket | `/ws` | 实时通信 | ✓ |
| 工作台 | `/dashboard` | 统计数据 | ✓ |
| 错误监控 | `/errors` | 错误报告 | ✓ |
| 消息通知 | `/notifications` | 系统通知 | ✓ |
| 性能监控 | `/monitoring` | 性能指标 | ✓ |
| 健康检查 | `/health` | 服务状态 | ✗ |

---

## API详细说明

### 1. 认证管理 (`/auth`)

#### 1.1 用户登录
```http
POST /api/v1/auth/login
```

**请求体**:
```json
{
  "username": "doctor_zhang",
  "password": "password123",
  "remember_me": false
}
```

**响应**: 见[认证说明](#认证说明)

---

#### 1.2 用户注册
```http
POST /api/v1/auth/register
```

**请求体**:
```json
{
  "username": "new_doctor",
  "email": "doctor@hospital.com",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!",
  "full_name": "李医生",
  "phone": "13800138000"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 2,
      "username": "new_doctor",
      "email": "doctor@hospital.com",
      "full_name": "李医生"
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 1.3 刷新Token
```http
POST /api/v1/auth/refresh
```

**请求体**:
```json
{
  "refresh_token": "your_refresh_token"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "tokens": {
      "access_token": "new_access_token",
      "refresh_token": "new_refresh_token",
      "token_type": "bearer",
      "expires_in": 1800
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 1.4 用户登出
```http
POST /api/v1/auth/logout
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 2. 用户管理 (`/users`)

#### 2.1 获取用户列表
```http
GET /api/v1/users/
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "doctor_zhang",
        "full_name": "张医生",
        "email": "zhang@hospital.com",
        "role": "doctor",
        "is_active": true
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 2.2 获取用户详情
```http
GET /api/v1/users/{user_id}
```

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `user_id`: 用户ID

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "doctor_zhang",
    "full_name": "张医生",
    "email": "zhang@hospital.com",
    "phone": "13800138000",
    "role": "doctor",
    "department": "放射科",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 3. 患者管理 (`/patients`)

#### 3.1 创建患者
```http
POST /api/v1/patients/
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "patient_id": "P20250130001",
  "name": "张三",
  "gender": "male",
  "birth_date": "1990-01-01",
  "phone": "13900139000",
  "id_card": "110101199001011234",
  "address": "北京市朝阳区",
  "emergency_contact": "李四",
  "emergency_phone": "13900139001"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "患者创建成功",
  "data": {
    "id": 1,
    "patient_id": "P20250130001",
    "name": "张三",
    "gender": "male",
    "age": 35,
    "phone": "13900139000",
    "created_at": "2025-01-30T10:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 3.2 获取患者列表
```http
GET /api/v1/patients/?page=1&page_size=20&search=张三
```

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | ✗ | 页码，默认1 |
| `page_size` | int | ✗ | 每页数量，默认20，最大100 |
| `search` | string | ✗ | 搜索关键词（姓名、患者ID、电话） |
| `gender` | string | ✗ | 性别筛选 (male/female) |
| `age_min` | int | ✗ | 最小年龄 |
| `age_max` | int | ✗ | 最大年龄 |
| `status` | string | ✗ | 状态筛选 |

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "patient_id": "P20250130001",
        "name": "张三",
        "gender": "male",
        "age": 35,
        "phone": "13900139000",
        "last_visit": "2025-01-30T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 3.3 获取患者详情
```http
GET /api/v1/patients/{patient_id}
```

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `patient_id`: 患者ID（数据库ID）

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "patient_id": "P20250130001",
    "name": "张三",
    "gender": "male",
    "birth_date": "1990-01-01",
    "age": 35,
    "phone": "13900139000",
    "id_card": "110101199001011234",
    "address": "北京市朝阳区",
    "emergency_contact": "李四",
    "emergency_phone": "13900139001",
    "medical_history": "无特殊病史",
    "allergies": "青霉素过敏",
    "created_at": "2025-01-30T10:00:00Z",
    "updated_at": "2025-01-30T10:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 3.4 更新患者信息
```http
PUT /api/v1/patients/{patient_id}
```

**Headers**: `Authorization: Bearer <token>`

**请求体**: 同创建患者，所有字段可选

---

#### 3.5 删除患者
```http
DELETE /api/v1/patients/{patient_id}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "患者删除成功",
  "data": null,
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 4. 文件上传 (`/upload`)

#### 4.1 上传影像文件
```http
POST /api/v1/upload/image
```

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**表单数据**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | ✓ | 影像文件（DICOM、JPG、PNG等） |
| `patient_id` | int | ✓ | 患者ID |
| `exam_type` | string | ✓ | 检查类型（zhengmian/cemian） |
| `description` | string | ✗ | 描述信息 |

**响应**:
```json
{
  "code": 200,
  "message": "文件上传成功",
  "data": {
    "file_info": {
      "id": 1,
      "filename": "spine_xray_001.jpg",
      "file_path": "/storage/images/2025/01/30/spine_xray_001.jpg",
      "file_size": 2048576,
      "mime_type": "image/jpeg",
      "patient_id": 1,
      "exam_type": "zhengmian",
      "uploaded_at": "2025-01-30T10:00:00Z"
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 5. 影像标注 (`/measurements`)

#### 5.1 获取影像测量数据
```http
GET /api/v1/measurements/{image_id}
```

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `image_id`: 影像ID

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "measurements": [
      {
        "type": "Cobb-Thoracic",
        "angle": 25.3,
        "upper_vertebra": "T5",
        "lower_vertebra": "T11",
        "apex_vertebra": "T7",
        "points": [
          {"x": 790.98, "y": 932.38},
          {"x": 903.99, "y": 940.12},
          {"x": 805.32, "y": 498.03},
          {"x": 895.67, "y": 502.15}
        ]
      }
    ],
    "reportText": "胸弯Cobb角25.3度，左凸畸形",
    "savedAt": "2025-01-30T10:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 5.2 保存测量数据
```http
POST /api/v1/measurements/
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "imageId": "IMG001",
  "patientId": 1,
  "examType": "zhengmian",
  "measurements": [
    {
      "type": "Cobb-Thoracic",
      "angle": 25.3,
      "upper_vertebra": "T5",
      "lower_vertebra": "T11",
      "apex_vertebra": "T7",
      "points": [
        {"x": 790.98, "y": 932.38},
        {"x": 903.99, "y": 940.12}
      ]
    }
  ],
  "reportText": "胸弯Cobb角25.3度",
  "savedAt": "2025-01-30T10:00:00Z"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "测量数据保存成功",
  "data": {
    "measurement_id": 1
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 6. 影像文件管理 (`/image-files`)

#### 6.1 获取影像文件列表
```http
GET /api/v1/image-files/?patient_id=1&exam_type=zhengmian
```

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | ✗ | 患者ID筛选 |
| `exam_type` | string | ✗ | 检查类型筛选 |
| `page` | int | ✗ | 页码 |
| `page_size` | int | ✗ | 每页数量 |

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "filename": "spine_xray_001.jpg",
        "file_path": "/storage/images/2025/01/30/spine_xray_001.jpg",
        "file_size": 2048576,
        "patient_id": 1,
        "patient_name": "张三",
        "exam_type": "zhengmian",
        "uploaded_at": "2025-01-30T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 6.2 获取影像文件详情
```http
GET /api/v1/image-files/{file_id}
```

**Headers**: `Authorization: Bearer <token>`

---

#### 6.3 删除影像文件
```http
DELETE /api/v1/image-files/{file_id}
```

**Headers**: `Authorization: Bearer <token>`

---

### 7. 报告管理 (`/reports`)

#### 7.1 创建报告
```http
POST /api/v1/reports/
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "patient_id": 1,
  "image_file_id": 1,
  "exam_type": "zhengmian",
  "findings": "胸弯Cobb角25.3度，左凸畸形",
  "diagnosis": "脊柱侧弯",
  "recommendations": "建议进一步治疗",
  "priority": "normal"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "报告创建成功",
  "data": {
    "id": 1,
    "report_number": "R20250130001",
    "patient_id": 1,
    "status": "draft",
    "created_at": "2025-01-30T10:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 7.2 获取报告列表
```http
GET /api/v1/reports/?page=1&patient_id=1&status=completed
```

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | ✗ | 页码 |
| `page_size` | int | ✗ | 每页数量 |
| `patient_id` | int | ✗ | 患者ID筛选 |
| `status` | string | ✗ | 状态筛选 (draft/completed/reviewed) |
| `priority` | string | ✗ | 优先级筛选 (low/normal/high) |
| `search` | string | ✗ | 搜索关键词 |

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "report_number": "R20250130001",
        "patient_id": 1,
        "patient_name": "张三",
        "exam_type": "zhengmian",
        "status": "completed",
        "priority": "normal",
        "created_at": "2025-01-30T10:00:00Z",
        "doctor_name": "张医生"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 7.3 获取报告详情
```http
GET /api/v1/reports/{report_id}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "report_number": "R20250130001",
    "patient_id": 1,
    "patient_name": "张三",
    "image_file_id": 1,
    "exam_type": "zhengmian",
    "findings": "胸弯Cobb角25.3度，左凸畸形",
    "diagnosis": "脊柱侧弯",
    "recommendations": "建议进一步治疗",
    "status": "completed",
    "priority": "normal",
    "created_by": 1,
    "doctor_name": "张医生",
    "created_at": "2025-01-30T10:00:00Z",
    "updated_at": "2025-01-30T11:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 7.4 更新报告
```http
PUT /api/v1/reports/{report_id}
```

**Headers**: `Authorization: Bearer <token>`

**请求体**: 同创建报告，所有字段可选

---

#### 7.5 删除报告
```http
DELETE /api/v1/reports/{report_id}
```

**Headers**: `Authorization: Bearer <token>`

---

### 8. AI辅助诊断 (`/ai-diagnosis`)

#### 8.1 获取可用AI模型列表
```http
GET /api/v1/ai-diagnosis/models
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "models": [
      {
        "name": "zhengmian",
        "description": "脊柱正位X光分析模型",
        "classes": ["C7", "T1-T12", "L1-L5"],
        "is_loaded": true
      },
      {
        "name": "cemian",
        "description": "脊柱侧位X光分析模型",
        "classes": ["vertebrae"],
        "is_loaded": true
      }
    ]
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 8.2 AI分析请求
```http
POST /api/v1/ai-diagnosis/analyze
```

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "image_id": "IMG001",
  "model_name": "zhengmian",
  "patient_id": "1",
  "priority": "normal"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "AI分析已提交，正在处理中",
  "data": {
    "analysis_id": "ANALYSIS_001",
    "status": "processing"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

#### 8.3 获取AI分析结果
```http
GET /api/v1/ai-diagnosis/analysis/{analysis_id}
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "analysis_id": "ANALYSIS_001",
    "status": "completed",
    "results": {
      "measurements": [
        {
          "type": "Cobb-Thoracic",
          "angle": 25.3,
          "confidence": 0.95
        }
      ],
      "diagnosis": "脊柱侧弯",
      "confidence": 0.92
    },
    "completed_at": "2025-01-30T10:05:00Z"
  },
  "timestamp": "2025-01-30T10:05:00Z"
}
```

---

### 9. 工作台 (`/dashboard`)

#### 9.1 获取工作台概览
```http
GET /api/v1/dashboard/overview
```

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total_patients": 150,
    "new_patients_today": 5,
    "new_patients_week": 23,
    "active_patients": 120,
    "total_studies": 450,
    "studies_today": 12,
    "studies_week": 78,
    "pending_studies": 15,
    "total_reports": 380,
    "pending_reports": 25,
    "completed_reports": 340,
    "overdue_reports": 15,
    "completion_rate": 89.5,
    "average_processing_time": 2.3,
    "system_alerts": 3,
    "generated_at": "2025-01-30T10:00:00Z"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 10. 健康检查 (`/health`)

#### 10.1 服务健康检查
```http
GET /api/v1/health/
```

**无需认证**

**响应**:
```json
{
  "code": 200,
  "message": "服务健康",
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-30T10:00:00Z",
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "storage": "healthy"
    }
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

### 11. WebSocket实时通信 (`/ws`)

#### 11.1 建立WebSocket连接
```
ws://localhost:8000/api/v1/ws/connect?token=<access_token>
```

**消息格式**:
```json
{
  "type": "notification",
  "data": {
    "title": "新报告",
    "message": "患者张三的报告已完成",
    "timestamp": "2025-01-30T10:00:00Z"
  }
}
```

---

## 数据模型

### 患者 (Patient)
```json
{
  "id": 1,
  "patient_id": "P20250130001",
  "name": "张三",
  "gender": "male",
  "birth_date": "1990-01-01",
  "age": 35,
  "phone": "13900139000",
  "id_card": "110101199001011234",
  "address": "北京市朝阳区",
  "emergency_contact": "李四",
  "emergency_phone": "13900139001",
  "medical_history": "无特殊病史",
  "allergies": "青霉素过敏",
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T10:00:00Z"
}
```

### 影像文件 (ImageFile)
```json
{
  "id": 1,
  "filename": "spine_xray_001.jpg",
  "file_path": "/storage/images/2025/01/30/spine_xray_001.jpg",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "patient_id": 1,
  "exam_type": "zhengmian",
  "description": "脊柱正位X光",
  "uploaded_by": 1,
  "uploaded_at": "2025-01-30T10:00:00Z"
}
```

### 测量数据 (Measurement)
```json
{
  "type": "Cobb-Thoracic",
  "angle": 25.3,
  "upper_vertebra": "T5",
  "lower_vertebra": "T11",
  "apex_vertebra": "T7",
  "points": [
    {"x": 790.98, "y": 932.38},
    {"x": 903.99, "y": 940.12},
    {"x": 805.32, "y": 498.03},
    {"x": 895.67, "y": 502.15}
  ]
}
```

### 报告 (Report)
```json
{
  "id": 1,
  "report_number": "R20250130001",
  "patient_id": 1,
  "image_file_id": 1,
  "exam_type": "zhengmian",
  "findings": "胸弯Cobb角25.3度，左凸畸形",
  "diagnosis": "脊柱侧弯",
  "recommendations": "建议进一步治疗",
  "status": "completed",
  "priority": "normal",
  "created_by": 1,
  "reviewed_by": 2,
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T11:00:00Z",
  "reviewed_at": "2025-01-30T12:00:00Z"
}
```

---

## 错误处理

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 413 | 请求实体过大 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |
| 502 | 网关错误 |
| 503 | 服务不可用 |
| 504 | 网关超时 |

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "code": 400,
  "message": "请求参数错误",
  "error_code": "INVALID_REQUEST",
  "path": "/api/v1/patients/",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

### 常见错误示例

**1. 认证失败 (401)**
```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "error_code": "AUTH_CREDENTIALS_INVALID",
  "path": "/api/v1/auth/login",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**2. 令牌过期 (401)**
```json
{
  "code": 401,
  "message": "令牌已过期",
  "error_code": "AUTH_TOKEN_EXPIRED",
  "path": "/api/v1/patients/",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**3. 权限不足 (403)**
```json
{
  "code": 403,
  "message": "权限不足，无法执行此操作",
  "error_code": "INSUFFICIENT_PERMISSIONS",
  "path": "/api/v1/users/1",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**4. 资源不存在 (404)**
```json
{
  "code": 404,
  "message": "患者不存在",
  "error_code": "PATIENT_NOT_FOUND",
  "path": "/api/v1/patients/999",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**5. 资源冲突 (409)**
```json
{
  "code": 409,
  "message": "用户名已被使用",
  "error_code": "USERNAME_TAKEN",
  "path": "/api/v1/auth/register",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**6. 数据验证失败 (422)**
```json
{
  "code": 422,
  "message": "数据验证失败",
  "error_code": "VALIDATION_ERROR",
  "path": "/api/v1/patients/",
  "timestamp": "2025-01-30T10:00:00Z",
  "details": [
    {
      "loc": ["body", "email"],
      "msg": "邮箱格式不正确",
      "type": "value_error.email"
    }
  ]
}
```

**7. 服务器内部错误 (500)**
```json
{
  "code": 500,
  "message": "系统内部错误",
  "error_code": "INTERNAL_ERROR",
  "path": "/api/v1/reports/",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

**8. 服务不可用 (503)**
```json
{
  "code": 503,
  "message": "AI模型不可用",
  "error_code": "AI_MODEL_NOT_AVAILABLE",
  "path": "/api/v1/ai-diagnosis/analyze",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

---

## 调用示例

### Python (requests)

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. 登录获取token
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "username": "doctor_zhang",
        "password": "password123"
    }
)
login_data = login_response.json()
if login_data["code"] == 200:
    token = login_data["data"]["tokens"]["access_token"]
    print(f"登录成功: {login_data['message']}")
else:
    print(f"登录失败: {login_data['message']}")
    exit(1)

# 2. 设置认证头
headers = {"Authorization": f"Bearer {token}"}

# 3. 获取患者列表
patients_response = requests.get(
    f"{BASE_URL}/patients/",
    headers=headers,
    params={"page": 1, "page_size": 20}
)
patients_data = patients_response.json()
if patients_data["code"] == 200:
    patients = patients_data["data"]["items"]
    total = patients_data["data"]["pagination"]["total"]
    print(f"获取到 {total} 个患者")

# 4. 创建患者
new_patient_response = requests.post(
    f"{BASE_URL}/patients/",
    headers=headers,
    json={
        "patient_id": "P20250130001",
        "name": "张三",
        "gender": "male",
        "birth_date": "1990-01-01",
        "phone": "13900139000"
    }
)
new_patient_data = new_patient_response.json()
if new_patient_data["code"] == 201:
    patient_id = new_patient_data["data"]["id"]
    print(f"患者创建成功，ID: {patient_id}")

# 5. 上传影像文件
with open("spine_xray.jpg", "rb") as f:
    files = {"file": f}
    data = {
        "patient_id": 1,
        "exam_type": "zhengmian"
    }
    upload_response = requests.post(
        f"{BASE_URL}/upload/image",
        headers=headers,
        files=files,
        data=data
    )
    upload_data = upload_response.json()
    if upload_data["code"] == 200:
        file_info = upload_data["data"]["file_info"]
        print(f"文件上传成功: {file_info['filename']}")
```

### JavaScript (fetch)

```javascript
const BASE_URL = 'http://localhost:8000/api/v1';

// 1. 登录
async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'doctor_zhang',
      password: 'password123'
    })
  });
  const data = await response.json();
  if (data.code === 200) {
    console.log('登录成功:', data.message);
    return data.data.tokens.access_token;
  } else {
    console.error('登录失败:', data.message);
    throw new Error(data.message);
  }
}

// 2. 获取患者列表
async function getPatients(token) {
  const response = await fetch(`${BASE_URL}/patients/?page=1&page_size=20`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (data.code === 200) {
    console.log(`获取到 ${data.data.pagination.total} 个患者`);
    return data.data.items;
  } else {
    console.error('获取失败:', data.message);
    throw new Error(data.message);
  }
}

// 3. 创建患者
async function createPatient(token, patientData) {
  const response = await fetch(`${BASE_URL}/patients/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patientData)
  });
  const data = await response.json();
  if (data.code === 201) {
    console.log('患者创建成功:', data.data);
    return data.data;
  } else {
    console.error('创建失败:', data.message);
    throw new Error(data.message);
  }
}

// 使用示例
(async () => {
  try {
    const token = await login();
    const patients = await getPatients(token);
    console.log('患者列表:', patients);
  } catch (error) {
    console.error('操作失败:', error.message);
  }
})();
```

### cURL

```bash
# 1. 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"doctor_zhang","password":"password123"}'

# 2. 获取患者列表
curl -X GET "http://localhost:8000/api/v1/patients/?page=1&page_size=20" \
  -H "Authorization: Bearer <your_token>"

# 3. 创建患者
curl -X POST http://localhost:8000/api/v1/patients/ \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P20250130001",
    "name": "张三",
    "gender": "male",
    "birth_date": "1990-01-01",
    "phone": "13900139000"
  }'

# 4. 上传影像文件
curl -X POST http://localhost:8000/api/v1/upload/image \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@spine_xray.jpg" \
  -F "patient_id=1" \
  -F "exam_type=zhengmian"
```

---

## 注意事项

### 1. 认证安全
- **Token有效期**: access_token 30分钟，refresh_token 7-30天
- **Token存储**: 建议存储在 httpOnly cookie 或安全的本地存储中
- **Token刷新**: access_token 过期前应主动刷新
- **登出处理**: 登出后应清除本地存储的token

### 2. 请求限制
- **频率限制**: 每个IP每分钟最多100次请求
- **文件大小**: 单个文件最大10MB
- **并发连接**: 每个用户最多10个并发连接

### 3. 数据格式
- **日期时间**: ISO 8601格式 (YYYY-MM-DDTHH:mm:ssZ)
- **字符编码**: UTF-8
- **数字精度**: 浮点数保留2位小数

### 4. 分页规范
- **默认页码**: 1
- **默认每页数量**: 20
- **最大每页数量**: 100
- **响应包含**: total（总数）、page（当前页）、page_size（每页数量）、total_pages（总页数）

### 5. 文件上传
- **支持格式**: DICOM (.dcm)、JPEG (.jpg, .jpeg)、PNG (.png)
- **文件命名**: 自动生成唯一文件名
- **存储路径**: `/storage/images/YYYY/MM/DD/`
- **缩略图**: 自动生成缩略图（可选）

### 6. WebSocket
- **连接认证**: 通过query参数传递token
- **心跳机制**: 每30秒发送ping消息
- **断线重连**: 客户端应实现自动重连机制
- **消息格式**: JSON格式

### 7. 性能优化
- **缓存策略**: 使用Redis缓存热点数据
- **数据库连接池**: 最大连接数100
- **异步处理**: AI分析等耗时操作使用后台任务
- **CDN加速**: 静态资源使用CDN

### 8. 错误处理建议
- **网络错误**: 实现重试机制（最多3次）
- **超时设置**: 请求超时时间30秒
- **错误日志**: 记录所有错误请求
- **用户提示**: 友好的错误提示信息

---

## 附录

### A. 模型服务API

模型服务独立部署，详见 [模型API文档](./model/zhengmian/backend/readme_API.md)

**模型服务地址**: `http://localhost:8001`

**主要接口**:
- `GET /health` - 健康检查
- `POST /predict` - 图片推理（计算指标）
- `POST /detect_keypoints` - 检测关键点（原始数据）

### B. API版本管理

- **当前版本**: v1
- **版本策略**: 语义化版本控制
- **废弃通知**: 提前3个月通知
- **兼容性**: 向后兼容

### C. 开发工具

**API文档**:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

**测试工具**:
- Postman Collection: 可导出
- 单元测试: pytest

### D. 联系方式

- **技术支持**: support@medical-system.com
- **问题反馈**: GitHub Issues
- **文档更新**: 2026-02-08

---

## 更新日志

### v1.1.0 (2026-02-08)
- ✅ **重大更新**: 统一所有API响应格式
- ✅ 新增标准响应格式（code, message, data, timestamp）
- ✅ 新增分页响应格式（items + pagination）
- ✅ 新增统一错误响应格式（code, message, error_code, path, timestamp）
- ✅ 新增完整的错误码参考文档
- ✅ 更新所有18个模块的API响应示例
- ✅ 更新Python、JavaScript代码示例以适配新格式
- ✅ 新增响应格式说明章节
- ✅ 新增错误码参考章节

### v1.0.0 (2026-01-30)
- ✅ 完整的后端API文档
- ✅ 认证、用户、患者、影像、报告等模块
- ✅ AI辅助诊断接口
- ✅ WebSocket实时通信
- ✅ 工作台统计数据
- ✅ 健康检查接口
- ✅ 详细的调用示例和注意事项


