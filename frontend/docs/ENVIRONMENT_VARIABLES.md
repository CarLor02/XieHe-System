# 环境变量配置说明

本文档说明XieHe医疗影像诊断系统前端所需的环境变量配置。

## 配置文件

- `.env.example` - 环境变量配置模板
- `.env.local` - 本地开发环境配置（不提交到Git）
- `.env.production` - 生产环境配置

## 快速开始

1. 复制配置模板：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local`，填入实际配置值

3. 重启开发服务器使配置生效

## AI检测服务配置

系统支持两种类型的X光片AI检测：**正位X光片**和**侧位X光片**，每种类型有两个不同的接口。

### 正位X光片AI检测

#### `NEXT_PUBLIC_AI_DETECT_URL`
- **用途**: AI测量功能接口
- **接口**: `/predict`
- **功能**: 返回测量结果和关键点
- **示例**: 
  - 开发环境: `http://localhost:8001/predict`
  - 生产环境: `http://115.190.121.59:8001/predict`

#### `NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL`
- **用途**: AI检测功能接口
- **接口**: `/detect_keypoints`
- **功能**: 返回椎体关键点检测结果
- **示例**:
  - 开发环境: `http://localhost:8001/detect_keypoints`
  - 生产环境: `http://115.190.121.59:8001/detect_keypoints`

### 侧位X光片AI检测

#### `NEXT_PUBLIC_AI_DETECT_LATERAL_URL`
- **用途**: AI测量功能接口（侧位）
- **接口**: `/api/detect_and_keypoints`
- **功能**: 返回侧位X光片的测量结果和关键点
- **示例**:
  - 开发环境: `http://localhost:8002/api/detect_and_keypoints`
  - 生产环境: `http://115.190.121.59:8002/api/detect_and_keypoints`

#### `NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL`
- **用途**: AI检测功能接口（侧位）
- **接口**: `/api/detect`
- **功能**: 返回侧位X光片的椎体4个角点
- **示例**:
  - 开发环境: `http://localhost:8002/api/detect`
  - 生产环境: `http://115.190.121.59:8002/api/detect`

## 代码中的使用

### ImageViewer.tsx 中的使用示例

```typescript
// AI测量功能
if (imageData.examType === '侧位X光片') {
  // 使用侧位测量接口
  aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_URL || '';
} else {
  // 使用正位测量接口
  aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_URL || '';
}

// AI检测功能
if (imageData.examType === '侧位X光片') {
  // 使用侧位检测接口
  aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL || '';
} else {
  // 使用正位检测接口
  aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL || '';
}
```

## 其他重要环境变量

### 后端API配置

- `NEXT_PUBLIC_API_URL` - 后端API基础URL
- `NEXT_PUBLIC_API_BASE_URL` - 后端API基础URL（备用）
- `NEXT_PUBLIC_API_VERSION` - API版本号

### WebSocket配置

- `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket服务地址
- `NEXT_PUBLIC_ENABLE_WEBSOCKET` - 是否启用WebSocket

### 功能开关

- `NEXT_PUBLIC_ENABLE_AI_DIAGNOSIS` - 是否启用AI诊断功能
- `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` - 是否启用通知功能

## 环境变量命名规范

- 所有前端环境变量必须以 `NEXT_PUBLIC_` 开头才能在浏览器中访问
- 使用大写字母和下划线命名
- 按功能模块分组

## 注意事项

1. **安全性**: 不要在环境变量中存储敏感信息（如密码、私钥）
2. **版本控制**: `.env.local` 和 `.env.production` 不应提交到Git
3. **重启服务**: 修改环境变量后需要重启开发服务器
4. **构建时**: 生产环境构建时会使用 `.env.production` 中的配置

## 故障排查

### 问题1: AI检测接口调用失败

**错误信息**: "AI检测接口未配置"

**解决方法**:
1. 检查 `.env.local` 或 `.env.production` 中是否配置了相应的环境变量
2. 确认环境变量名称拼写正确
3. 重启开发服务器

### 问题2: 环境变量未生效

**解决方法**:
1. 确认环境变量以 `NEXT_PUBLIC_` 开头
2. 重启开发服务器 (`npm run dev`)
3. 清除浏览器缓存

### 问题3: 生产环境配置不正确

**解决方法**:
1. 检查 `.env.production` 文件是否存在
2. 确认生产环境构建时使用了正确的配置文件
3. 重新构建应用 (`npm run build`)

## 参考资料

- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
- [XieHe系统部署文档](../DEPLOYMENT.md)

