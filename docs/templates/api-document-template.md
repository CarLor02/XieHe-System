# API 文档模板

> 这是一个API文档的标准模板，请根据实际情况填写相关内容

# [API 名称]

## 概述
[简要描述API的功能和用途]

## 基础信息
- **Base URL**: `https://api.example.com/v1`
- **认证方式**: Bearer Token
- **内容类型**: `application/json`
- **API 版本**: v1.0

## 认证
[描述如何获取和使用认证令牌]

### 获取访问令牌
```http
POST /auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### 使用访问令牌
```http
Authorization: Bearer <your_access_token>
```

## 接口列表

### [接口名称]
- **方法**: `POST`
- **路径**: `/api/v1/resource`
- **描述**: [接口功能描述]

#### 请求参数
| 参数名 | 类型 | 必需 | 描述 | 示例 | 验证规则 |
|--------|------|------|------|------|----------|
| param1 | string | 是 | 参数描述 | "example" | 长度1-100 |
| param2 | integer | 否 | 参数描述 | 123 | 范围1-1000 |

#### 请求示例
```json
{
  "param1": "example_value",
  "param2": 123
}
```

#### 响应格式
**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "param1": "example_value",
    "created_at": "2025-09-24T10:00:00Z"
  },
  "message": "操作成功"
}
```

#### 错误响应
| 状态码 | 错误码 | 描述 | 示例响应 |
|--------|--------|------|----------|
| 400 | INVALID_PARAMS | 参数无效 | `{"success": false, "error": "INVALID_PARAMS", "message": "参数验证失败"}` |
| 401 | UNAUTHORIZED | 未授权 | `{"success": false, "error": "UNAUTHORIZED", "message": "访问令牌无效"}` |
| 404 | NOT_FOUND | 资源不存在 | `{"success": false, "error": "NOT_FOUND", "message": "资源不存在"}` |
| 500 | INTERNAL_ERROR | 服务器内部错误 | `{"success": false, "error": "INTERNAL_ERROR", "message": "服务器内部错误"}` |

#### 示例代码

**JavaScript/TypeScript**
```typescript
const response = await fetch('/api/v1/resource', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    param1: 'example_value',
    param2: 123
  })
});

const data = await response.json();
```

**Python**
```python
import requests

response = requests.post(
    'https://api.example.com/v1/resource',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    },
    json={
        'param1': 'example_value',
        'param2': 123
    }
)

data = response.json()
```

**cURL**
```bash
curl -X POST \
  https://api.example.com/v1/resource \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "param1": "example_value",
    "param2": 123
  }'
```

## 数据模型

### [模型名称]
```json
{
  "id": "integer - 唯一标识符",
  "name": "string - 名称",
  "created_at": "string - 创建时间 (ISO 8601)",
  "updated_at": "string - 更新时间 (ISO 8601)"
}
```

## 错误处理

### 通用错误格式
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述",
  "details": {
    "field": "具体错误信息"
  }
}
```

### 错误码说明
| 错误码 | HTTP状态码 | 描述 | 解决方案 |
|--------|------------|------|----------|
| INVALID_PARAMS | 400 | 请求参数无效 | 检查请求参数格式和内容 |
| UNAUTHORIZED | 401 | 未授权访问 | 检查访问令牌是否有效 |
| FORBIDDEN | 403 | 权限不足 | 联系管理员获取相应权限 |
| NOT_FOUND | 404 | 资源不存在 | 检查资源ID是否正确 |
| RATE_LIMITED | 429 | 请求频率超限 | 降低请求频率 |
| INTERNAL_ERROR | 500 | 服务器内部错误 | 联系技术支持 |

## 限制说明

### 请求频率限制
- 每个用户每分钟最多 100 次请求
- 超出限制将返回 429 状态码

### 数据大小限制
- 请求体最大 10MB
- 单个字段最大长度 1000 字符

## 版本变更

### v1.1 (计划中)
- 新增批量操作接口
- 优化响应性能

### v1.0 (当前版本)
- 初始版本发布
- 基础 CRUD 操作

## 相关链接
- [用户认证指南](./authentication.md)
- [错误处理指南](./error-handling.md)
- [SDK 文档](./sdk.md)

## 更新日志
| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2025-09-24 | v1.0 | 初始版本 | [作者名] |

---

**注意**: 请在使用此模板时，将所有 `[占位符]` 替换为实际内容，并删除不适用的部分。
