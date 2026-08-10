# Web 与 Expo 共享 API 客户端

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

## Web 组合

`frontend/infrastructure/http/` 创建主 API、公开 API、对象存储和外部服务客户端。
会话桥接器连接现有 Zustand session store，避免 store 与传输层循环依赖。

- 主 API 自动附带访问令牌，并在并发 401 时共享一次刷新请求。
- 对象存储预签名 URL 禁止附带系统令牌，并通过 metadata 接口读取 ETag。
- 业务 service 直接接收解包后的 data，不再重复解析 envelope。

## Expo 组合

`mobile-expo/src/infrastructure/` 使用 `expo-secure-store` 实现 TokenProvider，并从
`EXPO_PUBLIC_API_URL` 创建共享 Axios 客户端。当前只提供基础设施，不预设登录 UI；
后续 application 用例应通过 `HttpClient` 接口访问 API，不直接导入 Axios。

## 约束

- 业务模块不得重新创建 Axios 实例或直接解析统一响应协议。
- 外部绝对 URL 必须使用明确的无鉴权客户端，防止令牌跨源泄漏。
- 需要响应头、状态码或 ETag 时使用 `requestWithMetadata`，不要退回平台原生请求。
- 新分页接口使用统一分页协议；历史分页只在 contracts 的过渡解析器中兼容。
