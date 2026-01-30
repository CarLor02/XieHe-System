# API 文档

## 概述

XieHe医疗影像诊断系统API文档，基于FastAPI构建，提供RESTful API接口。

**基础信息:**
- 基础URL: `http://localhost:8080/api/v1`
- 认证方式: JWT Bearer Token
- 数据格式: JSON
- 字符编码: UTF-8

## 认证

### 获取访问令牌

```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "doctor1",
    "full_name": "张医生",
    "role": "doctor"
  }
}
```

### 使用令牌

在请求头中添加认证信息：
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## 用户管理

### 创建用户

```http
POST /users/
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "string",
  "email": "user@example.com",
  "password": "string",
  "full_name": "string",
  "role": "doctor|nurse|admin"
}
```

### 获取用户列表

```http
GET /users/?page=1&page_size=10&role=doctor
Authorization: Bearer {token}
```

### 获取用户详情

```http
GET /users/{user_id}
Authorization: Bearer {token}
```

### 更新用户信息

```http
PUT /users/{user_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "string",
  "email": "user@example.com",
  "role": "doctor"
}
```

## 患者管理

### 创建患者

```http
POST /patients/
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "张三",
  "age": 30,
  "gender": "M",
  "phone": "13800138000",
  "id_card": "110101199001011234",
  "address": "北京市朝阳区",
  "medical_history": "高血压病史"
}
```

### 获取患者列表

```http
GET /patients/?page=1&page_size=10&search=张三
Authorization: Bearer {token}
```

### 搜索患者

```http
GET /patients/search?q=张三&field=name
Authorization: Bearer {token}
```

## 影像管理

### 上传影像

```http
POST /images/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
patient_id: 1
study_type: "CT"
description: "胸部CT检查"
```

### 获取影像列表

```http
GET /images/?patient_id=1&study_type=CT&page=1&page_size=10
Authorization: Bearer {token}
```

### 获取影像详情

```http
GET /images/{image_id}
Authorization: Bearer {token}
```

### 获取影像元数据

```http
GET /images/{image_id}/metadata
Authorization: Bearer {token}
```

### 下载影像文件

```http
GET /images/{image_id}/download
Authorization: Bearer {token}
```

## AI诊断

### 提交AI分析请求

```http
POST /ai/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "image_id": 1,
  "analysis_type": "chest_xray",
  "priority": "normal"
}
```

### 获取AI分析结果

```http
GET /ai/results/{analysis_id}
Authorization: Bearer {token}
```

### 批量AI分析

```http
POST /ai/batch-analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "image_ids": [1, 2, 3],
  "analysis_type": "chest_xray"
}
```

## 报告管理

### 创建报告

```http
POST /reports/
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient_id": 1,
  "image_id": 1,
  "title": "胸部CT检查报告",
  "content": "检查所见：...",
  "diagnosis": "诊断结果：...",
  "recommendations": "建议：..."
}
```

### 获取报告列表

```http
GET /reports/?patient_id=1&status=draft&page=1&page_size=10
Authorization: Bearer {token}
```

### 更新报告

```http
PUT /reports/{report_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "更新的报告内容",
  "status": "completed"
}
```

### 导出报告

```http
GET /reports/{report_id}/export?format=pdf
Authorization: Bearer {token}
```

## 系统监控

### 获取系统状态

```http
GET /monitoring/status
Authorization: Bearer {token}
```

### 获取健康检查

```http
GET /health/
```

### 获取性能指标

```http
GET /monitoring/metrics?hours=24
Authorization: Bearer {token}
```

## 通知管理

### 获取通知列表

```http
GET /notifications/?unread_only=true&page=1&page_size=10
Authorization: Bearer {token}
```

### 标记通知已读

```http
PUT /notifications/{notification_id}/read
Authorization: Bearer {token}
```

### 发送通知

```http
POST /notifications/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "recipient_id": 1,
  "title": "新报告通知",
  "message": "您有新的检查报告需要查看",
  "type": "report"
}
```

## 错误处理

### 标准错误响应格式

```json
{
  "detail": "错误描述",
  "error_code": "ERROR_CODE",
  "timestamp": "2025-09-25T10:30:00Z"
}
```

### 常见错误码

| 状态码 | 错误码 | 描述 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 请求参数验证失败 |
| 401 | UNAUTHORIZED | 未授权访问 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 422 | UNPROCESSABLE_ENTITY | 请求格式正确但语义错误 |
| 429 | RATE_LIMIT_EXCEEDED | 请求频率超限 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

## 分页

所有列表接口都支持分页，使用以下参数：

- `page`: 页码，从1开始
- `page_size`: 每页数量，默认10，最大100

**响应格式:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_pages": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

## 过滤和排序

### 过滤参数

大多数列表接口支持过滤：
- `search`: 全文搜索
- `status`: 状态过滤
- `created_after`: 创建时间过滤
- `created_before`: 创建时间过滤

### 排序参数

- `sort_by`: 排序字段
- `sort_order`: 排序方向 (asc/desc)

示例：
```http
GET /patients/?search=张&sort_by=created_at&sort_order=desc
```
  
## WebSocket
### 连接


```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
```

### 消息格式

```json
{
  "type": "notification",
  "data": {
    "title": "新消息",
    "message": "您有新的通知"
  },
  "timestamp": "2025-09-25T10:30:00Z"
}
```

## SDK示例

### JavaScript/TypeScript

```typescript
class XieHeAPI {
  private baseURL = 'http://localhost:8080/api/v1';
  private token: string;

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  async getPatients(page = 1, pageSize = 10) {
    const response = await fetch(
      `${this.baseURL}/patients/?page=${page}&page_size=${pageSize}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return response.json();
  }
}
```

### Python

```python
import requests

class XieHeAPI:
    def __init__(self, base_url='http://localhost:8080/api/v1'):
        self.base_url = base_url
        self.token = None
    
    def login(self, username, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'username': username, 'password': password}
        )
        data = response.json()
        self.token = data['access_token']
        return data
    
    def get_patients(self, page=1, page_size=10):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(
            f'{self.base_url}/patients/',
            params={'page': page, 'page_size': page_size},
            headers=headers
        )
        return response.json()
```

## 版本控制

API版本通过URL路径控制：
- v1: `/api/v1/` (当前版本)
- v2: `/api/v2/` (未来版本)

## 限制

- 请求频率限制: 100次/分钟
- 文件上传大小限制: 100MB
- 并发连接限制: 1000个

## 支持

如有问题，请联系：
- 邮箱: support@xiehe-medical.com
- 文档: http://localhost:8080/docs
- 交互式文档: http://localhost:8080/redoc