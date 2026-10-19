# API 契约与生成流程

`openapi.json` 由当前 FastAPI 应用离线导出，是 Web 与 Expo 的共享契约。生成类型存放在
`packages/xiehe-api-contracts/src/generated.ts`，只通过 `@xiehe/api-contracts/generated`
提供新 DTO、`paths` 和 `operations`。不要手工修改 JSON 或生成文件。

## 常用命令

从仓库根目录执行，先完成 `npm ci` 和 `cd backend && uv sync --frozen`：

```bash
npm run api:update     # 离线导出后端 OpenAPI + 生成 TypeScript
npm run api:generate   # 仅根据 apiContract/openapi.json 生成 TypeScript
npm run api:check      # 检查后端与 JSON、JSON 与 TypeScript 均未漂移
```

导出调用 `app.openapi()`，不启动 lifespan、不连接数据库、Redis 或对象存储，也不要求
生产服务器开放 `/openapi.json`。导出文件按 key 排序，写入后原子替换。

生成器固定为 openapi-typescript 7.13.0，并保留以下五个参数：

```text
--export-type
--root-types
--root-types-no-schema-prefix
--root-types-keep-casing
--default-non-nullable
```

FastAPI 设置 `separate_input_output_schemas=False`，防止额外的 `-Input` / `-Output`
名称在保留原名时成为无效的 TypeScript 顶层标识符。新 DTO 使用稳定、合法的类名。
`default-non-nullable` 会使部分有默认值的输入字段成为 TS 必填字段，例如
`remember_me`、分页和排序；现有应用端口会明确补上后端默认值。它不会把可空字段变成
不可空，也不替更新请求填入默认字段。省略字段与显式 `null` 仍保留不同语义。

## 调用与分层

普通业务 API 采用固定的 POST 操作路径，资源 ID、查询、分页和筛选条件放入 JSON body。
API 文件位于 `@xiehe/api-sdk/api/*Api`，使用生成的顶层 DTO 声明：

```ts
import type { HttpApi } from '@stellarmesh/sdk';
import type { RequestGetPatient, PatientResponse } from '@xiehe/api-contracts/generated';

export function createPatientApi(http: HttpApi) {
  const requestGetPatient = http.post<RequestGetPatient, PatientResponse>(
    '/api/v1/patients/get'
  );
  return { requestGetPatient };
}
```

平台组合根绑定当前服务器和会话后，调用方传入 body。固定 Web 入口可以导出绑定后的
`requestXxx` 并使用 `import * as xxxApi`，错误监控 API 已采用该形态。共享包使用工厂，
避免移动端切换服务器/账号时把会话捕获在全局单例中。

SDK 已配置现有成功信封的解包，`TResponse` 代表 `data`。例如患者删除成功返回 `null`；
不能再把信封的 `message` 当成 DTO 内部字段。分页的实际 wire 结构为
`{ items, pagination: { total, page, page_size, total_pages } }`。

不在普通 DTO 上使用 `dict[str, Any]`。标注文档、组件诊断和外部模型透传等扩展 JSON
使用 `JsonValue`；这些开放文档仍需要领域解码/校验，生成类型不替代运行时验证。

## 必须保持的存储接口

本轮只为以下接口补充响应文档模型，不改其方法、路径、输入参数、鉴权、处理流程或
序列化。个人资料读取/更新也会生成头像预签名地址，因此一并保留 GET/PUT。
对象存储自身的签名 GET/PUT URL 不属于 FastAPI 路由，客户端继续原样使用。

```text
GET /api/v1/auth/me
PUT /api/v1/auth/me
POST /api/v1/auth/me/avatar/upload-session
POST /api/v1/auth/me/avatar/complete
DELETE /api/v1/auth/me/avatar
GET /api/v1/image-files/{file_id}/download-url
POST /api/v1/image-files/download-urls
GET /api/v1/image-files/{file_id}/download
POST /api/v1/image-files/{file_id}/ai/predict
DELETE /api/v1/image-files/{file_id}
PATCH /api/v1/image-files/{file_id}/content
GET /api/v1/upload/batches/config
POST /api/v1/upload/batches
GET /api/v1/upload/batches
POST /api/v1/upload/batches/{batch_id}/sessions
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/complete
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/upload-failed
POST /api/v1/upload/batches/{batch_id}/items/{item_id}/enqueue
GET /api/v1/upload/batches/{batch_id}/items
POST /api/v1/upload/sessions
POST /api/v1/upload/sessions/{session_id}/complete
GET /api/v1/upload/sessions/{session_id}
GET /api/v1/upload/records
```

健康、readiness/liveness、metrics 和根服务元数据继续使用 GET。模型测试本来就是
POST multipart，文件参数保持不变。所有权限与业务规则仍由原来的应用服务执行。

## 普通业务路由迁移

下表列出本轮调整的操作；原来就使用 POST 的登录、刷新、退出、密码修改、报告生成等
继续保留原路径。表中查询操作仍然只读，不因 HTTP 方法改变而变成写用例。

| 旧请求 | 新 POST 路径 |
| --- | --- |
| `GET /api/v1/permissions/users` | `/api/v1/permissions/users/list` |
| `GET /api/v1/dashboard/overview` | `/api/v1/dashboard/overview` |
| `GET /api/v1/dashboard/recent-activities` | `/api/v1/dashboard/recent-activities` |
| `GET /api/v1/dashboard/stats` | `/api/v1/dashboard/stats` |
| `POST /api/v1/patients/` / `POST /api/v1/patients` | `/api/v1/patients/create` |
| `GET /api/v1/patients/` / `GET /api/v1/patients` | `/api/v1/patients/list` |
| `GET /api/v1/patients/{patient_id}` | `/api/v1/patients/get` |
| `PUT /api/v1/patients/{patient_id}` | `/api/v1/patients/update` |
| `DELETE /api/v1/patients/{patient_id}` | `/api/v1/patients/delete` |
| `POST /api/v1/permissions/teams` | `/api/v1/permissions/teams/create` |
| `PATCH /api/v1/permissions/teams/{team_id}` | `/api/v1/permissions/teams/update` |
| `GET /api/v1/permissions/teams/search` | `/api/v1/permissions/teams/search` |
| `GET /api/v1/permissions/teams/my` | `/api/v1/permissions/teams/my` |
| `GET /api/v1/permissions/teams/{team_id}/members` | `/api/v1/permissions/teams/members/list` |
| `PATCH /api/v1/permissions/teams/{team_id}/members/{user_id}/role` | `/api/v1/permissions/teams/members/update-role` |
| `DELETE /api/v1/permissions/teams/{team_id}/members/{user_id}` | `/api/v1/permissions/teams/members/remove` |
| `POST /api/v1/permissions/teams/{team_id}/invite` | `/api/v1/permissions/teams/invite` |
| `GET /api/v1/permissions/invitations/my` | `/api/v1/permissions/invitations/my` |
| `POST /api/v1/permissions/invitations/{invitation_id}/respond` | `/api/v1/permissions/invitations/respond` |
| `POST /api/v1/permissions/teams/{team_id}/apply` | `/api/v1/permissions/teams/apply` |
| `GET /api/v1/permissions/teams/{team_id}/join-requests` | `/api/v1/permissions/teams/join-requests/list` |
| `POST /api/v1/permissions/teams/{team_id}/join-requests/{request_id}/review` | `/api/v1/permissions/teams/join-requests/review` |
| `DELETE /api/v1/permissions/teams/{team_id}/join-requests/{request_id}` | `/api/v1/permissions/teams/join-requests/cancel` |
| `GET /api/v1/image-files` | `/api/v1/image-files/list` |
| `GET /api/v1/image-files/navigation` | `/api/v1/image-files/navigation` |
| `GET /api/v1/image-files/patient/{patient_id}` | `/api/v1/image-files/patient/list` |
| `GET /api/v1/image-files/stats/summary` | `/api/v1/image-files/stats/summary` |
| `GET /api/v1/image-files/{file_id}` | `/api/v1/image-files/get` |
| `GET /api/v1/image-files/uploaders` | `/api/v1/image-files/uploaders` |
| `GET /api/v1/image-files/assignable-teams` | `/api/v1/image-files/assignable-teams` |
| `PATCH /api/v1/image-files/batch/exam-type` | `/api/v1/image-files/batch/exam-type` |
| `PATCH /api/v1/image-files/{file_id}/info` | `/api/v1/image-files/info/update` |
| `PATCH /api/v1/image-files/{file_id}/filename` | `/api/v1/image-files/rename` |
| `PATCH /api/v1/image-files/{file_id}/exam-type` | `/api/v1/image-files/exam-type/update` |
| `POST /api/v1/image-files/annotations/batch` | `/api/v1/image-files/annotations/batch` |
| `GET /api/v1/image-files/{file_id}/annotation-history` | `/api/v1/image-files/annotation-history/list` |
| `GET /api/v1/image-files/{file_id}/annotation-history/{version}` | `/api/v1/image-files/annotation-history/get` |
| `PUT /api/v1/image-files/{file_id}/annotation` | `/api/v1/image-files/annotation/save` |
| `POST /api/v1/reports/` | `/api/v1/reports/create` |
| `GET /api/v1/reports/` | `/api/v1/reports/list` |
| `GET /api/v1/reports/{report_id}` | `/api/v1/reports/get` |
| `PUT /api/v1/reports/{report_id}` | `/api/v1/reports/update` |
| `DELETE /api/v1/reports/{report_id}` | `/api/v1/reports/delete` |
| `GET /api/v1/models` | `/api/v1/models/list` |
| `POST /api/v1/models` | `/api/v1/models/create` |
| `GET /api/v1/models/configuration` | `/api/v1/models/configuration/get` |
| `PUT /api/v1/models/configuration` | `/api/v1/models/configuration/update` |
| `GET /api/v1/models/stats` | `/api/v1/models/stats` |
| `GET /api/v1/models/{model_id}` | `/api/v1/models/get` |
| `PUT /api/v1/models/{model_id}` | `/api/v1/models/update` |
| `POST /api/v1/models/{model_id}/refresh-status` | `/api/v1/models/refresh-status` |
| `POST /api/v1/models/{model_id}/activate` | `/api/v1/models/activate` |
| `DELETE /api/v1/models/{model_id}` | `/api/v1/models/delete` |
| `GET /api/v1/system/configs` | `/api/v1/system/configs` |
| `GET /api/v1/system/stats` | `/api/v1/system/stats` |
| `GET /api/v1/errors/stats?hours=...` | `/api/v1/errors/stats`，body 为 `{ hours }` |
| `DELETE /api/v1/errors/clear` | `/api/v1/errors/clear` |

## 发布与回退

这次普通业务路由是破坏性变更，不保留旧 REST 别名或运行时 404 降级。后端、Web 和
Expo 客户端必须作为同一版本协调发布；旧线上服务不能直接接收新 POST 路径。仓库
导出、构建和测试不代表已部署到 `xiehe.stellarmesh.cn`。

回退时回退同一版本的后端与两个客户端，不仅回退生成文件。此次没有数据库迁移，
没有删除数据库、上传对象或执行线上业务数据写入。

当前 FastAPI 未注册旧 keypoint detection、DICOM 和报告导出任务接口；这些兼容/外部
调用保持原有边界，不纳入已生成契约，也不因前端测试替身通过而宣称可用。

## 本轮验证边界

本轮通过以下验证：

- 后端 Ruff、格式和 mypy；35 项 HTTP/路由/schema/存储边界回归。
- 38 项真实测试库集成用例，覆盖影像可见性、团队权限、预签名下载、替换、重命名和
  批量修改。首批触及 90 秒运行时限，续跑未完成部分后全部通过；只使用专用测试库。
- `api:check` 两段漂移检查与完整 `verify:shared`；其中传输适配 10 项、业务请求
  7 项、协议 2 项测试通过。
- Web 类型检查、lint、95 组 404 项 Jest、生产静态构建；lint 无错误，保留现有 63 条
  `any` / hooks 依赖等警告。
- Expo 类型检查、lint、21 项移动端测试，以及 Android、iOS、Web bundle 导出。

没有在本轮部署服务，也没有进行线上账号的新增、修改、删除或真实文件上传验收；
Android/iOS 真机对新后端的业务验收需在配套后端部署后继续。
