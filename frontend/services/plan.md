## 当前目标

- 修复 `lib/api` 的 JWT 过期自动刷新链路，确保 `401 -> refresh -> retry original request`
- 将页面、组件、hook、usecase 里散落的 API 访问收口到 `services/`
- 页面层不再直接出现 `fetch()` 或直接拼接后端 API URL
- 页面层不再直接依赖 `apiClient`，统一改为调用 service

## 当前进度

- 已完成：`lib/api` 内部职责拆分，刷新请求不再附带旧 access token
- 已完成：`reports / models / permissions / patients / dashboard / header / task list / imaging viewer / dicom viewer / sync page` 主路径服务化
- 已完成：`imaging viewer` 内 `saveMeasurements / generateReport / useImageListFetcher / aiDetect` 改为走 service
- 已定位：`frontend/app/imaging/page.tsx` 仍在页面层手动拦截 `401` 并直接跳转登录，绕开了 `apiClient` 的 refresh/retry 链路
- 已定位：`/api/v1/notifications/messages` 后端返回分页结构，`Header` 之前按数组直接 `map`，会产生额外前端错误噪音
- 已定位：KMP 会基于 token `exp` 提前刷新，Web 端此前主要依赖请求命中 `401` 后再 refresh
- 已定位：KMP 只在明确 `unauthorized` 时判定 session 失效，Web 端此前会把部分非鉴权失败也当成登录失效
- 已定位：KMP 的 session 恢复是同步入口，Web 端需要等待持久化 hydration 完成后再决定是否跳登录
- 已定位：KMP 在应用重新回到前台后，刷新调度天然会继续；Web 端需要在 `visibilitychange/focus` 时补一次到期检查
- 剩余收尾：清理注释中的旧调用、处理备份文件 `frontend/app/dashboard/dashboard_backup.tsx`

## 已确认的 JWT 刷新根因

- `frontend/lib/api/authenticatedApiClient.ts`
  - 刷新请求虽然传了 `_skipAuthRefresh`
  - 但 request interceptor 依然会给 `/api/v1/auth/refresh` 附带旧的 `Authorization`
  - 后端 `backend/app/api/v1/endpoints/auth.py` 的 `/refresh` 只需要 `refresh_token`
  - 旧 access token 被一起带上后，服务端会直接把请求判成“凭证无效”，导致没有走到 refresh token 刷新成功的分支

## 散落 API 调用清单

### 1. 页面/组件直接使用 `apiClient`

- `frontend/components/Header.tsx`
  - 行为：通知消息、团队邀请
  - 动作：改为 `notificationServices` + `teamService`

- `frontend/components/TaskList.tsx`
  - 行为：待处理任务列表
  - 动作：改为 `imageServices`

- `frontend/components/dashboard/DashboardOverview.tsx`
  - 行为：dashboard stats/tasks/notifications/system stats
  - 动作：改为 `dashboardServices` + `notificationServices` + `systemServices`

- `frontend/app/reports/page.tsx`
  - 行为：报告列表
  - 动作：新增 `reportServices`

- `frontend/app/reports/export/page.tsx`
  - 行为：导出页报告列表
  - 动作：改为 `reportServices`

- `frontend/app/model-center/page.tsx`
  - 行为：模型列表/统计/激活/删除
  - 动作：新增 `modelServices`

- `frontend/app/model-center/AddModelDialog.tsx`
  - 行为：创建模型
  - 动作：改为 `modelServices`

- `frontend/app/model-center/settings/page.tsx`
  - 行为：模型配置读写
  - 动作：改为 `modelServices`

- `frontend/app/permissions/users/page.tsx`
  - 行为：用户权限详情
  - 动作：新增 `permissionServices`

- `frontend/app/permissions/roles/page.tsx`
  - 行为：角色列表
  - 动作：改为 `permissionServices`

- `frontend/app/patients/detail/PatientDetail.tsx`
  - 行为：患者详情、删除患者
  - 动作：改为现有 `patientServices`

- `frontend/app/patients/edit/EditPatient.tsx`
  - 行为：患者详情读取、更新患者
  - 动作：改为现有 `patientServices`

- `frontend/app/patients/enhanced/page.tsx`
  - 行为：存在残留 `apiClient` import
  - 动作：清理无用 import，确认无直连调用

### 2. 页面/组件直接使用 `fetch()`

- `frontend/app/imaging/viewer/image-viewer/index.tsx`
  - 行为：AI 测量
  - 动作：改为 `imageServices/aiMeasurementService`

- `frontend/components/medical/DICOMViewer.tsx`
  - 行为：加载 study / image info
  - 动作：新增 `dicomServices`

- `frontend/app/sync/page.tsx`
  - 行为：外部同步服务 `stats/files/inspect/preview-image/mark-synced`
  - 动作：新增 `syncServices`，把对本地同步服务的 `fetch()` 收口

### 3. hook / usecase 里还没接入 service 的地方

- `frontend/app/imaging/viewer/image-viewer/usecase/saveMeasurementsUseCase.ts`
  - 状态：已完成
  - 动作：改为 `measurementService` + `imageFileService.updateImageAnnotation`

- `frontend/app/imaging/viewer/image-viewer/usecase/generateReportUseCase.ts`
  - 状态：已完成
  - 动作：改为 `reportService.generateMeasurementReport`

- `frontend/app/imaging/viewer/image-viewer/hooks/useImageListFetcher.ts`
  - 状态：已完成
  - 动作：改为 `imageFileService.getImageFiles`

- `frontend/app/imaging/viewer/image-viewer/usecase/aiDetectionUseCase.ts`
  - 状态：已完成
  - 动作：改为 `imageServices/aiAnnotationService`

### 4. 仍然存在直接 `fetch()` 的非页面位置

- `frontend/hooks/useErrorHandler.ts`
  - 行为：手动错误上报
  - 状态：已完成
  - 动作：已统一走 `errorService`

- `frontend/components/common/ErrorBoundary.tsx`
  - 行为：错误上报
  - 状态：已完成
  - 动作：已统一走 `errorService`

- `frontend/services/errorService.ts`
  - 行为：服务内错误上报
  - 动作：保留 service 内封装，必要时再统一到 `lib/api`

### 5. 当前残留

- `frontend/app/dashboard/dashboard_backup.tsx`
  - 行为：备份页面中的旧 `fetch()`
  - 动作：保留为备份文件，若需要彻底清零 `rg` 结果，再决定删除或同步收口

- 注释中的旧调用
  - `frontend/app/imaging/viewer/image-viewer/index.tsx`
  - `frontend/app/imaging/viewer/image-viewer/usecase/aiMeasurementUseCase.ts`
  - 动作：不影响运行链路，后续可单独清理注释

## 本轮需要完成的动作

- [x] 记录散落调用点与收口计划
- [x] 拆分 `lib/api` 内部职责，修正 refresh 请求不应附带旧 token
- [x] 修复 JWT 过期后不自动重试的问题
- [x] 新增缺失的 services：`reportServices` / `modelServices` / `permissionServices` / `systemServices` / `dicomServices` / `syncServices`
- [x] 替换页面与组件中的直接 `apiClient` 调用
- [x] 替换页面中的直接 `fetch()` 调用
- [x] 消化 imaging viewer 里的 TODO，用 service 封装 usecase 访问
- [x] 改完后重新 `rg` 校验还有哪些散落请求残留
- [x] 根据复现日志修复 `imaging/page.tsx` 页面级 401 抢跑跳转
- [x] 修复通知消息 service 的分页返回兼容
- [x] 对齐 KMP：Web 增加基于 token `exp` 的提前 refresh
- [x] 对齐 KMP：Web 只在明确 `401/403` 时清理 session
- [x] 对齐 KMP：Web 等待 session hydration 后再初始化认证
- [x] 对齐 KMP：Web 在页面恢复可见时主动检查并 refresh
