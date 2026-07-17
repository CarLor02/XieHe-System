# 影像中心批量导入前端架构

批量导入属于影像中心的独立 feature：

```text
frontend/app/imaging/features/batch-import/
├── components/
│   └── BatchImportOverlay.tsx
├── domain/
│   ├── imageTransform.ts
│   ├── status.ts
│   └── types.ts
├── hooks/
│   └── useBatchImageImport.ts
└── usecases/
    └── runBatchImportPipeline.ts
```

## 职责

- `domain/types.ts` 定义本地文件状态、AI 状态和 Overlay Tab。
- `domain/status.ts` 负责后端大写状态到前端展示状态的纯转换。
- `domain/imageTransform.ts` 负责可选左右翻转。优先使用
  Web Worker + OffscreenCanvas，失败后单文件回退到主线程。
- `runBatchImportPipeline.ts` 编排预处理、批次创建、会话窗口、分片上传、
  单文件 complete 和失败状态写回。
- `useBatchImageImport.ts` 管理 React 状态、任务分页、轮询、重试和影像列表刷新。
- `BatchImportOverlay.tsx` 只渲染新建导入与任务查询界面。

API 适配位于 `frontend/services/imageServices/uploadService.ts`。feature 不直接
操作 Axios 响应信封。

## 边界

- `page.tsx` 只负责挂载 Overlay，并把搜索区按钮绑定到 `openOverlay`。
- 文件上传并发固定为 3，会话窗口由后端配置返回，默认 10。
- 批次上限由后端配置返回，获取失败时默认 200。
- AI 状态只以后端批次接口为准，不再通过影像 ID 集合推导。
- 本地 `File` 只存在于新建导入流程，不能写入全局状态或持久化缓存。
- 页面关闭后不能恢复未完成的浏览器分片上传，但已完成上传并进入 AI 队列的任务
  可以从任务 Tab 恢复。

## 虚拟化

待导入文件列表使用 `react-virtual`，DOM 只保留当前视口及 overscan 行。文件
状态仍按稳定 `client_file_id` 更新，滚动不会改变任务身份。
