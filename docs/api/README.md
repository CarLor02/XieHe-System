# API 接口文档

## 📋 概述

本目录包含医疗影像诊断系统的所有API接口文档，采用RESTful API设计规范。

## 📁 文档结构

```
docs/api/
├── README.md                    # API文档总览
├── authentication.md            # 认证授权接口
├── users.md                     # 用户管理接口
├── patients.md                  # 患者管理接口
├── images.md                    # 影像管理接口
├── diagnosis.md                 # 诊断相关接口
├── reports.md                   # 报告管理接口
├── statistics.md                # 统计分析接口
├── system.md                    # 系统管理接口
├── schemas/                     # 数据模型定义
│   ├── user.json               # 用户数据模型
│   ├── patient.json            # 患者数据模型
│   ├── image.json              # 影像数据模型
│   ├── diagnosis.json          # 诊断数据模型
│   └── report.json             # 报告数据模型
└── examples/                    # 请求响应示例
    ├── authentication/         # 认证示例
    ├── patients/               # 患者管理示例
    ├── images/                 # 影像管理示例
    └── reports/                # 报告管理示例
```

## 🔗 API 基础信息

- **Base URL**: `https://api.medical-system.com/v1`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

## 📚 接口分类

### 🔐 认证授权
- [认证授权接口](./authentication.md) - 登录、注册、令牌管理

### 👥 用户管理
- [用户管理接口](./users.md) - 用户CRUD、权限管理

### 🏥 患者管理
- [患者管理接口](./patients.md) - 患者信息管理、病历管理

### 🖼️ 影像管理
- [影像管理接口](./images.md) - DICOM上传、存储、查看

### 🤖 诊断服务
- [诊断相关接口](./diagnosis.md) - AI诊断、结果管理

### 📊 报告管理
- [报告管理接口](./reports.md) - 诊断报告生成、编辑、导出

### 📈 统计分析
- [统计分析接口](./statistics.md) - 数据统计、图表生成

### ⚙️ 系统管理
- [系统管理接口](./system.md) - 系统配置、监控、日志

## 🚀 快速开始

### 1. 获取访问令牌

```bash
curl -X POST https://api.medical-system.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doctor@example.com",
    "password": "your_password"
  }'
```

### 2. 使用令牌访问API

```bash
curl -X GET https://api.medical-system.com/v1/patients \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📖 通用规范

### 请求格式
- 所有POST/PUT请求必须包含 `Content-Type: application/json`
- 请求体必须是有效的JSON格式
- 日期时间格式使用ISO 8601标准

### 响应格式
```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2025-09-24T10:00:00Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "具体错误信息"
    }
  },
  "timestamp": "2025-09-24T10:00:00Z"
}
```

### HTTP状态码
- `200` - 请求成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 权限不足
- `404` - 资源不存在
- `422` - 数据验证失败
- `500` - 服务器内部错误

## 🔒 安全说明

### 认证要求
- 除了登录接口外，所有API都需要有效的JWT令牌
- 令牌应在请求头中以 `Authorization: Bearer <token>` 格式发送

### 权限控制
- 不同角色用户具有不同的API访问权限
- 详细权限说明请参考各接口文档

### 数据安全
- 所有敏感数据传输必须使用HTTPS
- 患者隐私信息需要特殊权限才能访问

## 📊 API版本管理

### 当前版本
- **v1.0** - 当前稳定版本

### 版本策略
- 向后兼容的更改会在当前版本中发布
- 破坏性更改会发布新的主版本
- 旧版本会有6个月的维护期

## 🧪 测试环境

### 测试服务器
- **Base URL**: `https://api-test.medical-system.com/v1`
- **测试账号**: `test@example.com` / `test123`

### API测试工具
- [Postman Collection](./examples/postman_collection.json)
- [Swagger UI](https://api.medical-system.com/docs)

## 📞 技术支持

- **API文档问题**: api-docs@medical-system.com
- **技术支持**: tech-support@medical-system.com
- **Bug报告**: [GitHub Issues](https://github.com/your-org/medical-system/issues)

## 📝 更新日志

### v1.0.0 (2025-09-24)
- 初始版本发布
- 包含基础的用户、患者、影像管理功能

---

**注意**: 本API文档会随着系统开发进度持续更新，请关注最新版本。
