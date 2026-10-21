# Web 与 Expo 共享 API 协议及 SDK

## 协议来源和生成

当前 FastAPI 的请求、成功数据、分页和统一错误模型是协议来源。离线导出文件位于
`apiContract/openapi.json`，两端共享 `@xiehe/api-contracts/generated`；禁止手工修改
生成文件。完整命令、接口迁移表和存储例外见 [API 契约说明](../../../apiContract/README.md)。

```bash
npm run api:update    # 离线导出 FastAPI OpenAPI，再生成 TypeScript
npm run api:generate  # 仅根据已提交的 JSON 重新生成类型
npm run api:check     # 检查 Python -> JSON -> TypeScript 两段是否漂移
```

生成工具固定为 `openapi-typescript@7.13.0`，完整保留 export-type、root-types、
root-types-no-schema-prefix、root-types-keep-casing、default-non-nullable 五个参数。
生成 DTO 只通过独立子入口提供，不能 `export *` 混入旧根入口。
`http/v1` 保留已有公开类型名和 UI 所需的部分字段投影，非存储业务的字段类型引用生成
DTO，不再另写一份 wire 字段。存储和其他外部服务的兼容协议仍单独维护。

## 请求与平台边界

```text
@stellarmesh/sdk                    声明式 HTTP、信封、并发刷新与传输
@xiehe/api-client/stellarmesh        项目配置、令牌/会话桥接与字节传输端口适配
@xiehe/api-contracts/generated      自动生成的请求/响应 DTO、paths、operations
@xiehe/api-sdk/api/*Api              各业务域的 requestXxx 声明工厂
@xiehe/api-sdk/clients              已有应用端口、分页映射和存储兼容调用
```

SDK 使用 npm 发布的 `@stellarmesh/sdk@0.3.1`，不依赖相邻仓库源码或本机文件链接。
移除了原来自行实现 Axios 传输和刷新协调的代码；`HttpClient` 保留为平台无关的字节
传输端口，由 SDK 适配实现。存储分片继续通过 metadata 读取 ETag。

`*Api.ts` 通过注入 `HttpApi` 声明接口，声明时不发请求。移动端能切换服务器/账号，
因此共享包不绑定全局客户端。业务 API 不读取环境变量、平台存储或 React 状态。

```ts
import * as patientApi from '@xiehe/api-sdk/api/patientApi';

// 在应用组合根绑定当前服务器和会话；方法内部由 http.post<TRequest,TResponse>(url) 声明。
const { requestGetPatient } = patientApi.createPatientApi(http);
const patient = await requestGetPatient({ patient_id: 7 });
```

Web 的固定入口可直接导出绑定后的请求；调用方使用命名空间即可。例如
`frontend/services/systemServices/errorApi.ts` 与错误监控页面已经使用该方式。
原有 service facade 继续承接 UI 命名和分页显示，路径只在共享声明中维护。

## 会话和存储

- Web 组合根读取环境变量，通过 bridge 注入 Zustand 会话；登录、退出和切换会话时
  更换 epoch，刷新保持同一 epoch。刷新结果在保存前复核 epoch。
- Web 的定时刷新、窗口恢复刷新、直接刷新及 SDK 401 回调在会话 store 内共享同一
  epoch 的进行中请求；页面卸载或 epoch 变化后，旧回调不得触发退出。
- Expo 通过 SecureStore 的有序存储适配读取令牌。退出先终止本机会话，再使用捕获的
  令牌通知服务端；旧刷新不得重新保存令牌或清除后来登录的会话。
- SDK 在同一会话内协调并发 401，保存新令牌后使用新请求头重放一次；刷新明确返回
  401/403、不存在刷新凭证或重放仍为 401 时退出。网络、服务、格式或保存故障保留
  当前凭证，允许后续请求恢复。普通资料接口的 403 作为权限错误处理。
- 对象存储使用独立无会话实例。签名 URL 的方法、请求参数和字节内容保持原样，禁止
  注入业务 Bearer；上传成功仍以服务端完成确认为准。
- AI 存储代理 `/api/v1/image-files/{file_id}/ai/predict` 保留模型原始测量 JSON。
  共享 SDK 仅对该请求设置 `responseMode: 'raw'`，继续使用业务认证及 401 恢复；
  HTTP 错误仍正常抛出。其余业务请求继续按统一信封解析。
- 默认不增加重试或请求超时；调用方按原有上传/退出流程明确设置超时。
- 应用错误工具把 SDK 的 HTTP 状态、错误码、字段错误映射为既有 UI 错误语义。

## 验证

运行 `npm run verify:api`、两端类型检查、Web lint/test/build 和 Expo lint/test/export。
本地 HTTP 测试覆盖发布制品的真实请求、并发刷新、会话变化、令牌隔离、上传字节和
ETag；不使用生产业务数据证明这些传输契约。

`packages/xiehe-api-sdk/tests/sdk.test.ts` 同时覆盖 AI 原始 JSON 的真实 HTTP 返回、
保留的 POST 路径/请求体/认证、过期令牌刷新重放和 HTTP 503，避免只 mock 上层测量
服务而漏掉响应格式的兼容约束。

### 4 月自动退出问题与回归范围

历史提交 `5583c92c`（2026-04-14）修复了刷新响应读取层级：后端返回
`data.tokens.access_token`，旧代码读取 `data.access_token`。该提交也把资料校验的
临时错误与未授权分开，加入了定时及恢复窗口时的刷新。

当前生成的 `RefreshTokenResult` 约束 `tokens` 层级。SDK 展平统一信封后，两端读取
`result.tokens` 并先保存再重放；响应缺少 access token 会报告格式错误并保留会话。
SDK 自身不负责应用存储和页面生命周期，不能仅以更换 SDK 作为修复证据。

2026-10-21 增加了以下回归测试：

- `frontend/lib/api/session/sessionStore.integration.test.ts`：本机 HTTP 服务与真实发布的
  SDK、Web store、持久化恢复共同验证过期 access token、并发/主动刷新、临时失败、
  响应格式错误、明确失效、权限 403 及跨会话隔离。
- `frontend/app/providers-session.test.tsx`：虚拟时钟与窗口事件验证定时/恢复回调在新登录
  后不能退出新会话，临时失败不退出，明确失效仍正常退出。
- `mobile-expo/src/infrastructure/http/createExpoApiInfrastructure.test.ts`：本机 HTTP 服务、
  真实 SDK 和有序令牌存储验证令牌保存、刷新合并、故障恢复和退出后迟到的响应。

同一组 Web 用例在本轮修复前有 5 个失败，分别覆盖刷新重复、资料 403 和三个旧回调
入口的误退出。历史代码通过 `git show` 对比，不需要运行旧版本或接触其数据库。

后端默认 access token 有效期为 720 分钟，refresh token 为 7 天，记住登录为 30 天；
刷新沿用 `remember_me` 并签发新的一对令牌。默认值以部署配置为准。刷新凭证过期、
用户失效、JWT 密钥变更或 Redis 会话状态丢失仍会要求重新登录；SDK 无法恢复服务端
已不再认可的凭证。当前 Compose 向后端注入 JWT 密钥，状态 Redis 使用持久化卷和
AOF，不应把状态 Redis 当成可随意清空的业务查询缓存。

这些测试证明本地应用链路的行为，不代表已完成线上长时间运行或真机验收。

当前本地 FastAPI 未注册旧的 `ai/detect-keypoints`、DICOM 和报告导出任务接口。
这些已有调用不属于本轮可生成的业务契约；涉及对象/外部模型的兼容调用保留，不据此
宣称对应线上能力已验收。新增普通业务接口必须先进入后端模型和 OpenAPI。
