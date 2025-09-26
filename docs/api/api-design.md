# 医疗影像诊断系统 - API 接口设计文档

## 📋 文档概述

本文档详细描述了医疗影像诊断系统的 RESTful API 接口设计，包括认证授权、患者管理、影像处理、诊断报告等所有核心功能的 API 规范。

**文档版本**: 1.0.0  
**创建日期**: 2025-09-24  
**更新日期**: 2025-09-24  
**作者**: 医疗影像团队  
**API 版本**: v1

## 🎯 设计原则

### RESTful 设计原则

1. **资源导向**: 每个 URL 代表一种资源
2. **HTTP 动词**: 使用标准 HTTP 方法(GET, POST, PUT, DELETE)
3. **状态码**: 使用标准 HTTP 状态码
4. **无状态**: 每个请求包含完整信息
5. **统一接口**: 保持接口风格一致

### API 设计规范

- **版本控制**: 使用 URL 路径版本控制 `/api/v1/`
- **命名规范**: 使用复数名词，小写字母，连字符分隔
- **响应格式**: 统一 JSON 格式响应
- **错误处理**: 标准化错误响应格式
- **分页**: 统一分页参数和响应格式

## 🌐 API 基础信息

### 基础 URL

```
开发环境: http://localhost:8000/api/v1
测试环境: https://test-api.medical-system.com/api/v1
生产环境: https://api.medical-system.com/api/v1
```

### 通用请求头

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access_token>
X-Request-ID: <unique_request_id>
X-Client-Version: <client_version>
```

### 通用响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2025-09-24T10:30:00Z",
  "request_id": "req_123456789"
}
```

### 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "message": "请求参数错误",
  "error": {
    "type": "ValidationError",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "timestamp": "2025-09-24T10:30:00Z",
  "request_id": "req_123456789"
}
```

## 🔐 认证授权模块

### 1. 用户登录

```http
POST /api/v1/auth/login
```

**请求体**:

```json
{
  "username": "doctor001",
  "password": "password123",
  "remember_me": false,
  "captcha": "ABCD",
  "captcha_key": "captcha_key_123"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "user_123",
      "username": "doctor001",
      "full_name": "张医生",
      "email": "doctor001@hospital.com",
      "roles": ["doctor"],
      "permissions": ["patient:read", "study:read", "report:write"]
    }
  }
}
```

### 2. 刷新令牌

```http
POST /api/v1/auth/refresh
```

**请求体**:

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. 用户登出

```http
POST /api/v1/auth/logout
```

### 4. 获取当前用户信息

```http
GET /api/v1/auth/me
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "doctor001",
    "full_name": "张医生",
    "email": "doctor001@hospital.com",
    "phone": "138****1234",
    "department": "放射科",
    "job_title": "主治医师",
    "roles": ["doctor"],
    "permissions": ["patient:read", "study:read", "report:write"],
    "last_login_at": "2025-09-24T09:30:00Z"
  }
}
```

## 👥 用户管理模块

### 1. 获取用户列表

```http
GET /api/v1/users?page=1&size=20&search=张&department=放射科&role=doctor&is_active=true
```

**查询参数**:

- `page`: 页码 (默认: 1)
- `size`: 每页数量 (默认: 20, 最大: 100)
- `search`: 搜索关键词 (姓名、用户名、邮箱)
- `department`: 部门筛选
- `role`: 角色筛选
- `is_active`: 状态筛选

**响应**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user_123",
        "username": "doctor001",
        "full_name": "张医生",
        "email": "doctor001@hospital.com",
        "phone": "138****1234",
        "department": "放射科",
        "job_title": "主治医师",
        "roles": ["doctor"],
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### 2. 创建用户

```http
POST /api/v1/users
```

**请求体**:

```json
{
  "username": "doctor002",
  "email": "doctor002@hospital.com",
  "password": "password123",
  "full_name": "李医生",
  "phone": "13812345678",
  "department_id": "dept_001",
  "job_title": "住院医师",
  "role_ids": ["role_doctor"]
}
```

### 3. 获取用户详情

```http
GET /api/v1/users/{user_id}
```

### 4. 更新用户信息

```http
PUT /api/v1/users/{user_id}
```

### 5. 删除用户

```http
DELETE /api/v1/users/{user_id}
```

### 6. 重置用户密码

```http
POST /api/v1/users/{user_id}/reset-password
```

## 🏥 患者管理模块

### 1. 获取患者列表

```http
GET /api/v1/patients?page=1&size=20&search=张三&gender=male&age_min=18&age_max=65
```

**查询参数**:

- `search`: 搜索关键词 (姓名、患者编号、手机号、身份证号)
- `gender`: 性别筛选 (male/female/other)
- `age_min`: 最小年龄
- `age_max`: 最大年龄
- `created_start`: 创建开始时间
- `created_end`: 创建结束时间

**响应**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "patient_123",
        "patient_no": "P202501001",
        "name": "张三",
        "gender": "male",
        "age": 45,
        "birth_date": "1979-03-15",
        "phone": "138****5678",
        "id_card": "110101********1234",
        "address": "北京市朝阳区***",
        "created_at": "2025-09-24T08:00:00Z",
        "study_count": 3,
        "last_study_date": "2025-09-20"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 500,
      "pages": 25
    }
  }
}
```

### 2. 创建患者

```http
POST /api/v1/patients
```

**请求体**:

```json
{
  "name": "李四",
  "gender": "female",
  "birth_date": "1985-06-20",
  "phone": "13987654321",
  "id_card": "110101198506201234",
  "address": "北京市海淀区中关村大街1号",
  "emergency_contact": "王五",
  "emergency_phone": "13612345678",
  "blood_type": "A+",
  "height": 165.5,
  "weight": 55.0,
  "allergies": ["青霉素", "海鲜"],
  "medical_history": {
    "diabetes": "2020-01-01",
    "hypertension": "2019-06-15"
  },
  "insurance_type": "城镇职工医保",
  "insurance_no": "1101011234567890"
}
```

### 3. 获取患者详情

```http
GET /api/v1/patients/{patient_id}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "patient_123",
    "patient_no": "P202501001",
    "name": "张三",
    "gender": "male",
    "age": 45,
    "birth_date": "1979-03-15",
    "phone": "13812345678",
    "id_card": "110101197903151234",
    "address": "北京市朝阳区建国路88号",
    "emergency_contact": "张夫人",
    "emergency_phone": "13987654321",
    "blood_type": "O+",
    "height": 175.0,
    "weight": 70.5,
    "allergies": ["青霉素"],
    "medical_history": {
      "hypertension": "2018-03-01"
    },
    "insurance_type": "城镇职工医保",
    "insurance_no": "1101011234567890",
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-09-24T08:00:00Z",
    "studies": [
      {
        "id": "study_456",
        "study_date": "2025-09-20",
        "modality": "CT",
        "body_part": "胸部",
        "study_description": "胸部CT平扫",
        "status": "completed"
      }
    ]
  }
}
```

### 4. 更新患者信息

```http
PUT /api/v1/patients/{patient_id}
```

### 5. 删除患者

```http
DELETE /api/v1/patients/{patient_id}
```

### 6. 获取患者检查历史

```http
GET /api/v1/patients/{patient_id}/studies?page=1&size=10&modality=CT&date_start=2025-01-01
```

## 🏥 影像管理模块

### 1. 获取影像研究列表

```http
GET /api/v1/studies?page=1&size=20&patient_id=patient_123&modality=CT&status=completed&date_start=2025-09-01&date_end=2025-09-24
```

**查询参数**:

- `patient_id`: 患者 ID
- `modality`: 设备类型 (CT/MR/DR/CR/US 等)
- `status`: 研究状态 (scheduled/in_progress/completed/cancelled)
- `body_part`: 检查部位
- `priority`: 优先级 (low/normal/high/urgent)
- `date_start`: 开始日期
- `date_end`: 结束日期

**响应**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "study_456",
        "study_uid": "1.2.840.113619.2.5.1762583153.215519.978957063.78",
        "patient": {
          "id": "patient_123",
          "name": "张三",
          "patient_no": "P202501001"
        },
        "study_date": "2025-09-20",
        "study_time": "14:30:00",
        "study_description": "胸部CT平扫",
        "modality": "CT",
        "body_part": "胸部",
        "referring_physician": "李医生",
        "performing_physician": "王技师",
        "status": "completed",
        "priority": "normal",
        "series_count": 3,
        "instance_count": 150,
        "total_size": 52428800,
        "created_at": "2025-09-20T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 200,
      "pages": 10
    }
  }
}
```

### 2. 创建影像研究

```http
POST /api/v1/studies
```

**请求体**:

```json
{
  "patient_id": "patient_123",
  "study_date": "2025-09-24",
  "study_time": "10:30:00",
  "study_description": "腹部CT增强",
  "modality": "CT",
  "body_part": "腹部",
  "referring_physician": "张医生",
  "performing_physician": "李技师",
  "priority": "normal",
  "clinical_info": "腹痛待查"
}
```

### 3. 获取影像研究详情

```http
GET /api/v1/studies/{study_id}
```

### 4. 获取影像序列列表

```http
GET /api/v1/studies/{study_id}/series
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": "series_789",
      "series_uid": "1.2.840.113619.2.5.1762583153.215519.978957063.79",
      "series_number": 1,
      "series_description": "Axial CT",
      "modality": "CT",
      "body_part": "胸部",
      "protocol_name": "Chest Routine",
      "series_date": "2025-09-20",
      "series_time": "14:35:00",
      "instance_count": 50,
      "series_size": 17476267,
      "thumbnail_path": "/thumbnails/series_789.jpg"
    }
  ]
}
```

### 5. 获取影像实例列表

```http
GET /api/v1/series/{series_id}/instances
```

### 6. 上传 DICOM 文件

```http
POST /api/v1/studies/{study_id}/upload
Content-Type: multipart/form-data
```

**请求体**:

```
files: [DICOM文件1, DICOM文件2, ...]
```

### 7. 获取影像预览

```http
GET /api/v1/instances/{instance_id}/preview?size=thumbnail&format=jpeg
```

**查询参数**:

- `size`: 图片尺寸 (thumbnail/small/medium/large/original)
- `format`: 图片格式 (jpeg/png/webp)
- `window_center`: 窗位
- `window_width`: 窗宽

### 8. 下载 DICOM 文件

```http
GET /api/v1/instances/{instance_id}/download
```

## 📋 诊断报告模块

### 1. 获取诊断报告列表

```http
GET /api/v1/reports?page=1&size=20&patient_id=patient_123&doctor_id=doctor_001&status=approved&date_start=2025-09-01
```

**查询参数**:

- `patient_id`: 患者 ID
- `study_id`: 研究 ID
- `doctor_id`: 报告医生 ID
- `reviewer_id`: 审核医生 ID
- `status`: 报告状态 (draft/pending/reviewing/approved/rejected/cancelled)
- `priority`: 优先级
- `date_start`: 开始日期
- `date_end`: 结束日期

**响应**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "report_001",
        "report_no": "R202509240001",
        "patient": {
          "id": "patient_123",
          "name": "张三",
          "patient_no": "P202501001"
        },
        "study": {
          "id": "study_456",
          "study_date": "2025-09-20",
          "modality": "CT",
          "body_part": "胸部"
        },
        "title": "胸部CT平扫报告",
        "status": "approved",
        "priority": "normal",
        "report_date": "2025-09-21",
        "doctor": {
          "id": "doctor_001",
          "name": "李医生"
        },
        "reviewer": {
          "id": "doctor_002",
          "name": "王医生"
        },
        "approved_at": "2025-09-21T16:00:00Z",
        "created_at": "2025-09-21T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### 2. 创建诊断报告

```http
POST /api/v1/reports
```

**请求体**:

```json
{
  "patient_id": "patient_123",
  "study_id": "study_456",
  "template_id": "template_001",
  "title": "胸部CT平扫报告",
  "clinical_info": "胸痛3天，伴咳嗽",
  "examination_method": "胸部CT平扫",
  "findings": "双肺纹理清晰，未见明显异常密度影...",
  "impression": "双肺未见明显异常",
  "recommendations": "建议定期复查",
  "priority": "normal"
}
```

### 3. 获取诊断报告详情

```http
GET /api/v1/reports/{report_id}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "report_001",
    "report_no": "R202509240001",
    "patient": {
      "id": "patient_123",
      "name": "张三",
      "patient_no": "P202501001",
      "gender": "male",
      "age": 45
    },
    "study": {
      "id": "study_456",
      "study_uid": "1.2.840.113619.2.5.1762583153.215519.978957063.78",
      "study_date": "2025-09-20",
      "modality": "CT",
      "body_part": "胸部",
      "study_description": "胸部CT平扫"
    },
    "title": "胸部CT平扫报告",
    "clinical_info": "胸痛3天，伴咳嗽",
    "examination_method": "胸部CT平扫，层厚5mm，层间距5mm",
    "findings": "双肺纹理清晰，未见明显异常密度影。双侧胸膜光滑，未见胸腔积液。纵隔居中，心影大小正常。",
    "impression": "双肺未见明显异常",
    "recommendations": "建议定期复查，如有症状加重及时就诊",
    "conclusion": "双肺CT检查未见明显异常",
    "status": "approved",
    "priority": "normal",
    "report_date": "2025-09-21",
    "report_time": "10:30:00",
    "doctor": {
      "id": "doctor_001",
      "name": "李医生",
      "job_title": "主治医师"
    },
    "reviewer": {
      "id": "doctor_002",
      "name": "王医生",
      "job_title": "副主任医师"
    },
    "reviewed_at": "2025-09-21T15:30:00Z",
    "review_comments": "报告内容准确，同意发布",
    "approved_by": {
      "id": "doctor_002",
      "name": "王医生"
    },
    "approved_at": "2025-09-21T16:00:00Z",
    "version": 1,
    "is_final": true,
    "created_at": "2025-09-21T10:00:00Z",
    "updated_at": "2025-09-21T16:00:00Z"
  }
}
```

### 4. 更新诊断报告

```http
PUT /api/v1/reports/{report_id}
```

### 5. 提交报告审核

```http
POST /api/v1/reports/{report_id}/submit
```

### 6. 审核诊断报告

```http
POST /api/v1/reports/{report_id}/review
```

**请求体**:

```json
{
  "action": "approve",
  "comments": "报告内容准确，同意发布"
}
```

### 7. 导出报告 PDF

```http
GET /api/v1/reports/{report_id}/export?format=pdf
```

## 🤖 AI 辅助诊断模块

### 1. 提交 AI 分析请求

```http
POST /api/v1/ai/analyze
```

**请求体**:

```json
{
  "study_id": "study_456",
  "series_ids": ["series_789", "series_790"],
  "analysis_type": "chest_ct",
  "model_version": "v2.1.0",
  "priority": "normal",
  "parameters": {
    "window_center": 40,
    "window_width": 400,
    "slice_thickness": 5.0
  }
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "task_id": "ai_task_001",
    "status": "queued",
    "estimated_time": 300,
    "created_at": "2025-09-24T10:00:00Z"
  }
}
```

### 2. 获取 AI 分析状态

```http
GET /api/v1/ai/tasks/{task_id}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "task_id": "ai_task_001",
    "status": "completed",
    "progress": 100,
    "started_at": "2025-09-24T10:01:00Z",
    "completed_at": "2025-09-24T10:05:00Z",
    "result": {
      "confidence": 0.95,
      "findings": [
        {
          "type": "nodule",
          "location": "右上肺",
          "size": "8mm",
          "confidence": 0.92,
          "coordinates": [120, 80, 15],
          "description": "右上肺见小结节影"
        }
      ],
      "suggestions": ["建议进一步CT增强检查", "建议3个月后复查"],
      "risk_level": "low"
    }
  }
}
```

### 3. 获取 AI 分析结果

```http
GET /api/v1/ai/tasks/{task_id}/result
```

### 4. 获取 AI 模型列表

```http
GET /api/v1/ai/models?category=chest_ct&status=active
```

## 📊 系统管理模块

### 1. 获取系统配置

```http
GET /api/v1/system/configs?category=general&is_public=true
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "config_key": "system.name",
      "config_value": "医疗影像诊断系统",
      "config_type": "string",
      "category": "general",
      "description": "系统名称"
    },
    {
      "config_key": "upload.max_file_size",
      "config_value": "104857600",
      "config_type": "number",
      "category": "upload",
      "description": "最大上传文件大小(字节)"
    }
  ]
}
```

### 2. 更新系统配置

```http
PUT /api/v1/system/configs/{config_key}
```

### 3. 获取系统统计

```http
GET /api/v1/system/stats?period=today
```

**响应**:

```json
{
  "success": true,
  "data": {
    "period": "today",
    "date": "2025-09-24",
    "stats": {
      "patients": {
        "total": 1250,
        "new_today": 15,
        "growth_rate": 0.012
      },
      "studies": {
        "total": 3500,
        "new_today": 45,
        "by_modality": {
          "CT": 20,
          "MR": 15,
          "DR": 8,
          "US": 2
        }
      },
      "reports": {
        "total": 3200,
        "new_today": 38,
        "pending": 12,
        "approved": 26
      },
      "storage": {
        "total_size": 5497558138880,
        "used_size": 2748779069440,
        "usage_rate": 0.5
      }
    }
  }
}
```

### 4. 获取操作日志

```http
GET /api/v1/system/audit-logs?page=1&size=50&user_id=user_123&action=login&date_start=2025-09-01
```

### 5. 系统健康检查

```http
GET /api/v1/system/health
```

**响应**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-09-24T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": {
        "status": "healthy",
        "response_time": 5
      },
      "redis": {
        "status": "healthy",
        "response_time": 2
      },
      "storage": {
        "status": "healthy",
        "available_space": "2TB"
      },
      "ai_service": {
        "status": "healthy",
        "queue_size": 3
      }
    }
  }
}
```

## 📱 通知消息模块

### 1. 获取通知列表

```http
GET /api/v1/notifications?page=1&size=20&type=system&is_read=false
```

### 2. 标记通知已读

```http
PUT /api/v1/notifications/{notification_id}/read
```

### 3. 发送通知

```http
POST /api/v1/notifications
```

**请求体**:

```json
{
  "type": "report_approved",
  "title": "报告已审核通过",
  "content": "您的胸部CT报告已审核通过",
  "recipients": ["user_123", "user_456"],
  "channels": ["web", "email"],
  "priority": "normal",
  "data": {
    "report_id": "report_001",
    "patient_name": "张三"
  }
}
```

## 📈 HTTP 状态码说明

### 成功状态码

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `204 No Content`: 请求成功，无返回内容

### 客户端错误

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权，需要登录
- `403 Forbidden`: 禁止访问，权限不足
- `404 Not Found`: 资源不存在
- `409 Conflict`: 资源冲突
- `422 Unprocessable Entity`: 请求格式正确但语义错误
- `429 Too Many Requests`: 请求过于频繁

### 服务器错误

- `500 Internal Server Error`: 服务器内部错误
- `502 Bad Gateway`: 网关错误
- `503 Service Unavailable`: 服务不可用
- `504 Gateway Timeout`: 网关超时

## 🔒 安全规范

### 认证机制

- 使用 JWT Bearer Token 认证
- Token 有效期：访问令牌 1 小时，刷新令牌 7 天
- 支持令牌刷新和撤销

### 权限控制

- 基于 RBAC 的权限控制
- 接口级权限验证
- 数据级权限过滤

### 安全头部

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### 请求限制

- API 调用频率限制：100 次/分钟/用户
- 文件上传大小限制：100MB/文件
- 请求超时时间：30 秒

## 📋 分页规范

### 请求参数

- `page`: 页码，从 1 开始
- `size`: 每页数量，默认 20，最大 100

### 响应格式

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

## 🔍 搜索规范

### 搜索参数

- `search`: 关键词搜索
- `sort`: 排序字段
- `order`: 排序方向 (asc/desc)
- `filter`: 过滤条件

### 搜索示例

```http
GET /api/v1/patients?search=张&sort=created_at&order=desc&filter=gender:male,age_min:18
```

---

**维护说明**: 本 API 文档将随系统功能迭代持续更新，确保文档与实际接口保持一致。所有接口变更都会在此文档中体现并通知相关开发人员。
