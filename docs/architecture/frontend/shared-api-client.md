# Web 与 Expo 共享 API 协议及 SDK

## 边界

`packages/xiehe-api-client` 提供跨平台 HTTP 协议和 Axios 传输实现：

```text
packages/xiehe-api-client/src/
├── contracts/       # ApiEnvelope、错误和分页协议
├── application/     # HttpClient、TokenProvider、会话回调端口
└── infrastructure/  # Axios 实现、401 刷新协调和错误归一化
```

公共包不读取环境变量、不访问浏览器存储或 SecureStore，也不执行路由跳转。所有
平台差异通过 composition root 注入。

业务线协议与 endpoint SDK 分别位于：

```text
packages/xiehe-api-contracts/src/http/v1/ # 请求、响应、查询 DTO
packages/xiehe-api-sdk/src/clients/       # endpoint 与分页兼容
```

`api-contracts` 只表达可序列化的 HTTP wire shape；`api-sdk` 只依赖
`HttpClient`，不读取环境变量，也不依赖 React、DOM、`File`、`Blob` 或平台存储。

## 协议事实源

仓库中的 `docs/api/openapi.yaml` 已经过时，当前不得据此生成 TypeScript DTO 或
SDK。共享协议以已经在线运行并通过 Web 交互验证的 v1 请求和响应为迁移来源；后端
schema 只用于人工发现明显漂移，不能覆盖现有兼容字段。待后端 OpenAPI 与真实接口
重新一致后，再单独评估 codegen。

## Web 组合

`frontend/infrastructure/http/` 创建主 API、公开 API、对象存储和外部服务客户端，
并在 `sdk.ts` 组合 `createXieheApiSdk()`。
会话桥接器连接现有 Zustand session store，避免 store 与传输层循环依赖。

- 主 API 自动附带访问令牌，并在并发 401 时共享一次刷新请求。
- 对象存储预签名 URL 禁止附带系统令牌，并通过 metadata 接口读取 ETag。
- SDK 统一接收解包后的 data，并维护 endpoint、查询参数和历史分页兼容。
- `frontend/services` 只保留 Web 命名 facade、错误提示和文件上传/下载 adapter；
  不再作为 DTO 或 endpoint 的事实源。

## Expo 组合

`mobile-expo/src/infrastructure/` 使用 `expo-secure-store` 实现 TokenProvider，并从
`EXPO_PUBLIC_API_URL` 创建共享 Axios 客户端。当前只提供基础设施，不预设登录 UI；
后续 application 用例应通过共享 SDK 访问 API，不直接导入 Axios。刷新令牌也使用
共享 auth DTO 与 SDK，不在移动端重复声明响应结构。

## 约束

- 业务模块不得重新创建 Axios 实例或直接解析统一响应协议。
- 外部绝对 URL 必须使用明确的无鉴权客户端，防止令牌跨源泄漏。
- 需要响应头、状态码或 ETag 时使用 `requestWithMetadata`，不要退回平台原生请求。
- 新分页接口使用统一分页协议；历史分页只在 contracts 的过渡解析器中兼容。
- 新业务 DTO 必须加入 `@xiehe/api-contracts` 对应 v1 业务域；平台视图模型不得放入
  协议包。
- endpoint 路径只在 `@xiehe/api-sdk` 维护；`File/Blob/FormData` 编排留在平台
  adapter。

## 验证

```bash
npm run verify:api
npm run type-check:web
npm run type-check:mobile
```
