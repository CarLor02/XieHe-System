# Image Viewer Architecture

## Overview

`frontend/app/imaging/viewer/` 现在只承担路由入口职责，真正的影像标注实现全部收口在 `frontend/app/imaging/viewer/image-viewer/`。

当前架构的目标是把原先单个超大组件中的职责拆成 6 层：

1. 页面装配层
2. 状态编排层
3. 标注领域层
4. 画布子系统
5. 配置与目录层
6. 共享纯工具层

整体原则：

- `components/` 负责展示和事件桥接
- `hooks/` 负责副作用与状态编排
- `domain/` 只放纯业务规则和纯数据变换
- `catalog/` 负责标注定义与工具清单
- `canvas/` 负责画布通用纯函数
- `shared/` 负责常量、几何和标签工具

## Directory Layout

### Structure of folder imaging
.
├── comparison
│   └── page.tsx
├── page.tsx
└── viewer
├── image-viewer
│   ├── canvas
│   │   ├── hit-test
│   │   │   └── shape-hit-test.ts
│   │   ├── tools
│   │   │   └── tool-state.ts
│   │   └── transform
│   │       └── coordinate-transform.ts
│   ├── catalog
│   │   ├── annotation-catalog.ts
│   │   └── exam-tool-catalog.ts
│   ├── components
│   │   ├── annotation-canvas
│   │   │   ├── hitTest
│   │   │   │   ├── hitTestMeasurement.ts
│   │   │   │   └── selectionBox.ts
│   │   │   ├── hooks
│   │   │   │   ├── useCanvasContextMenu.ts
│   │   │   │   ├── useCanvasSelection.ts
│   │   │   │   └── useCanvasViewport.ts
│   │   │   ├── layers
│   │   │   │   ├── ImageLayer.tsx
│   │   │   │   ├── MeasurementLayer.tsx
│   │   │   │   ├── OverlayLayer.tsx
│   │   │   │   └── PreviewLayer.tsx
│   │   │   ├── renderers
│   │   │   │   ├── annotation-tool-renderers
│   │   │   │   │   ├── AnnotationToolRenderer.tsx
│   │   │   │   │   ├── annotationToolRendererUtils.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── renderC7Offset.tsx
│   │   │   │   │   ├── renderHorizontalLines.tsx
│   │   │   │   │   ├── renderPI.tsx
│   │   │   │   │   ├── renderPT.tsx
│   │   │   │   │   ├── renderSacralWithPerpendicular.tsx
│   │   │   │   │   ├── renderSingleHorizontalLine.tsx
│   │   │   │   │   ├── renderSingleLineWithHorizontal.tsx
│   │   │   │   │   ├── renderSingleVerticalLine.tsx
│   │   │   │   │   ├── renderSS.tsx
│   │   │   │   │   ├── renderSVA.tsx
│   │   │   │   │   ├── renderT1Slope.tsx
│   │   │   │   │   ├── renderT1Tilt.tsx
│   │   │   │   │   ├── renderTPA.tsx
│   │   │   │   │   ├── renderTwoLines.tsx
│   │   │   │   │   └── renderVerticalLines.tsx
│   │   │   │   ├── renderMeasurement.tsx
│   │   │   │   ├── shared
│   │   │   │   │   └── rendererUtils.tsx
│   │   │   │   ├── support-shape-renderers
│   │   │   │   │   ├── angleRenderer.tsx
│   │   │   │   │   ├── arrowRenderer.tsx
│   │   │   │   │   ├── circleRenderer.tsx
│   │   │   │   │   ├── ellipseRenderer.tsx
│   │   │   │   │   ├── lineRenderer.tsx
│   │   │   │   │   ├── polygonRenderer.tsx
│   │   │   │   │   ├── rectangleRenderer.tsx
│   │   │   │   │   └── vertebraCenterRenderer.tsx
│   │   │   │   └── types.ts
│   │   │   └── types.ts
│   │   ├── AnnotationCanvas.tsx
│   │   ├── AnnotationToolbar.tsx
│   │   ├── BindingPanel.tsx
│   │   ├── ReportPanel.tsx
│   │   └── StudyHeader.tsx
│   ├── domain
│   │   ├── annotation-binding.ts
│   │   ├── annotation-calculation.ts
│   │   ├── annotation-inheritance.ts
│   │   ├── annotation-metadata.ts
│   │   └── annotation-serialization.ts
│   ├── hooks
│   │   ├── useAnnotationEngine.ts
│   │   ├── useAnnotationPersistence.ts
│   │   ├── useCanvasInteraction.ts
│   │   ├── useImageStudy.ts
│   │   └── useMeasurements.ts
│   ├── index.tsx
│   ├── shared
│   │   ├── constants
│   │   │   ├── image.ts
│   │   │   ├── index.ts
│   │   │   ├── interaction.ts
│   │   │   ├── selectors.ts
│   │   │   ├── standard-distance.ts
│   │   │   └── text.ts
│   │   ├── geometry
│   │   │   ├── index.ts
│   │   │   └── primitives.ts
│   │   └── labels
│   │       ├── index.ts
│   │       └── measurement-labels.ts
│   └── types.ts
└── page.tsx

### Route entry

- `frontend/app/imaging/viewer/page.tsx`
  - Next.js 路由入口
  - 直接渲染 `./image-viewer`

### Page root

- `frontend/app/imaging/viewer/image-viewer/index.tsx`
  - 页面壳
  - 组装 study、measurement、annotation persistence、canvas interaction、header、toolbar、binding panel、report panel
  - 这里是当前页面级状态汇合点

### Types

- `frontend/app/imaging/viewer/image-viewer/types.ts`
  - 页面通用类型
  - 包含 `ImageData`、`Measurement`、`Point`、`Tool` 等共享结构

- `frontend/app/imaging/viewer/image-viewer/components/annotation-canvas/types.ts`
  - 画布局部状态类型
  - 包含 drawing state、reference lines 等

### Hooks

- `hooks/useImageStudy.ts`
  - study/image payload 拉取
  - image data 和 annotation payload 组装

- `hooks/useMeasurements.ts`
  - measurement 列表
  - 报告文本
  - 标准距离与联动重算

- `hooks/useAnnotationPersistence.ts`
  - annotation JSON、measurements、local state 的加载与保存
  - 导入导出与恢复

- `hooks/useAnnotationEngine.ts`
  - bindings、自动绑定、继承点、结构联动

- `hooks/useCanvasInteraction.ts`
  - 页面级画布工具状态
  - selected tool、clicked points、standard distance 模式等

### Components

- `components/StudyHeader.tsx`
  - 顶部 study/header 区域

- `components/AnnotationToolbar.tsx`
  - 右侧工具栏
  - 当前承载工具按钮、绑定面板和报告面板入口

- `components/BindingPanel.tsx`
  - point binding 面板

- `components/ReportPanel.tsx`
  - 报告生成与展示

- `components/AnnotationCanvas.tsx`
  - 画布主控组件
  - 负责拼装 canvas hooks、layers、renderer dispatch

### Canvas sub-system

`components/annotation-canvas/` 已经从主画布组件中拆出 5 类子模块。

#### Canvas hooks

- `hooks/useCanvasViewport.ts`
  - 图片加载
  - object URL 生命周期
  - image position / image scale
  - brightness / contrast
  - wheel zoom、重置视图、center on point

- `hooks/useCanvasSelection.ts`
  - hand 模式下的命中、悬浮、选中、拖拽
  - 依赖 `hitTest/` 和 selection box

- `hooks/useCanvasContextMenu.ts`
  - 右键菜单
  - 编辑文字弹窗
  - 删除标注、编辑 label

#### Hit test

- `hitTest/hitTestMeasurement.ts`
  - 图形命中分发
  - 已按映射表组织，而不是长串 `if`

- `hitTest/selectionBox.ts`
  - selection bounds 计算
  - 同样按 measurement type 映射分发

#### Layers

- `layers/ImageLayer.tsx`
  - 图片渲染与 transform

- `layers/MeasurementLayer.tsx`
  - 已完成标注渲染
  - 委托给 `renderMeasurement.tsx`

- `layers/PreviewLayer.tsx`
  - 绘制预览
  - reference lines
  - standard distance preview

- `layers/OverlayLayer.tsx`
  - 右键菜单
  - 编辑文字弹窗

#### Renderers

- `renderers/renderMeasurement.tsx`
  - 正式标注 renderer 总入口
  - 只负责按 measurement type 分发

- `renderers/support-shape-renderers/`
  - 辅助图形 renderer
  - 例如圆形、椭圆、矩形、箭头、多边形、角度、距离、锥体中心

- `renderers/annotation-tool-renderers/`
  - 医学标注工具 renderer
  - 例如 `renderPI`、`renderPT`、`renderTPA`、`renderSVA`、`renderT1Tilt`
  - 每个医学工具 renderer 已经单独拆成文件

- `renderers/shared/rendererUtils.tsx`
  - renderer 共用 helper
  - 例如 indexed point、value tag、description label、selected/hovered 判断

### Domain

- `domain/annotation-binding.ts`
  - point binding 结构与纯变换

- `domain/annotation-calculation.ts`
  - measurement value 计算
  - description 计算

- `domain/annotation-inheritance.ts`
  - 继承点规则
  - S1、shared anatomical points 等规则

- `domain/annotation-metadata.ts`
  - annotation metadata 读取
  - type -> color、description、auxiliary shape 判断等

- `domain/annotation-serialization.ts`
  - annotation 序列化 / 反序列化

### Catalog

- `catalog/annotation-catalog.ts`
  - 标注定义目录
  - points needed、tool metadata、特殊渲染挂载等

- `catalog/exam-tool-catalog.ts`
  - exam type -> tool list

### Canvas pure utilities

- `canvas/transform/coordinate-transform.ts`
  - image/screen 坐标转换

- `canvas/tools/tool-state.ts`
  - tool state 相关纯判断

- `canvas/hit-test/shape-hit-test.ts`
  - 更底层的 shape hit test 纯函数

### Shared

- `shared/constants/*`
  - interaction、image、selectors、text、standard distance 等常量

- `shared/geometry/*`
  - 纯几何计算

- `shared/labels/*`
  - 标签尺寸、label bounds 等工具

## Runtime Data Flow

当前页面的主要数据流如下：

1. `page.tsx` 进入 `image-viewer/index.tsx`
2. `useImageStudy` 拉取 study/image/annotation payload
3. `useMeasurements` 持有 measurement、standard distance、report state
4. `useAnnotationEngine` 根据 measurements 编排 bindings 和继承逻辑
5. `useAnnotationPersistence` 负责保存、恢复、导入、导出
6. `useCanvasInteraction` 管理页面级工具状态
7. `AnnotationCanvas` 负责把页面级状态转成画布交互
8. `AnnotationCanvas` 内部再调用 viewport/selection/context menu hooks
9. `MeasurementLayer` 通过 `renderMeasurement.tsx` 把 measurement 分发到具体 renderer

## Renderer Architecture

当前 renderer 已分成两条线：

### 1. Support shape renderers

用于辅助图形类标注：

- `圆形标注`
- `椭圆标注`
- `矩形标注`
- `箭头标注`
- `多边形标注`
- `距离标注`
- `角度标注`
- `锥体中心`

这些 renderer 位于 `renderers/support-shape-renderers/`。

### 2. Annotation tool renderers

用于医学测量工具本身：

- `PI`
- `PT`
- `SS`
- `SVA`
- `TPA`
- `T1 Tilt`
- `T1 Slope`
- `Pelvic`
- `Sacral`
- `AVT`
- `TTS`
- `LLD`
- `TS(Trunk Shift)`
- `Cobb`
- `CA`
- `C2-C7 CL`
- `TK T2-T5`
- `TK T5-T12`
- `T10-L2`
- `LL L1-S1`
- `LL L1-L4`
- `LL L4-S1`

这些 renderer 位于 `renderers/annotation-tool-renderers/`，每种特殊结构都已经拆成独立文件。

### Shared renderer helpers

目前两类 renderer 共用：

- `renderMeasurementValueTag`
- `renderDescriptionLabel`
- `renderIndexedPoint`
- selected/hovered 视觉状态判断

这保证了 tag 和普通 description label 的视觉行为是统一的，而不是每个 renderer 自己重复实现。

## Current Boundaries

当前已经成立的边界：

- `image-viewer/` 不再依赖旧 `viewer` 根目录中的 helper/config/utils
- `renderMeasurement.tsx` 已经不再依赖 `genericMeasurementRenderer`
- 医学工具 renderer 和辅助图形 renderer 已经分离
- `hitTest` 和 selection box 已经从主事件处理函数中拆出

## Current Non-Ideal Parts

虽然整体结构已经成型，但还有两类地方仍然偏重：

### 1. `index.tsx` 仍然较厚

当前页面壳仍承担不少业务动作：

- AI measurement 流程
- tag / treatment advice UI state
- 部分按钮事件编排

后续可继续把这些动作下沉到更清晰的 page-level controller hook。

### 2. `AnnotationCanvas.tsx` 仍然是画布主控组件

虽然已经拆出 viewport、selection、context menu、layers 和 renderers，但它仍然持有较多桥接职责：

- drawing state
- live mouse point
- reference line state
- 部分 tool-specific 交互分支

它已经不再是 8000 行单文件，但还不是“完全纯 view 组件”。

## Dependency Rules

后续维护建议遵守这些依赖方向：

- `components/*` 可以依赖 `hooks`、`domain`、`catalog`、`shared`、`canvas`
- `hooks/*` 可以依赖 `domain`、`catalog`、`shared`、`canvas`
- `domain/*` 只能依赖 `types`、`shared`
- `catalog/*` 只能依赖 `types`、`shared`、必要的纯 renderer registry
- `shared/*` 不应依赖 React、router、API、DOM

尤其要避免重新出现这些问题：

- 在 `domain/` 放 JSX
- 在 renderer 里各自复制 tag / label 逻辑
- 在 `AnnotationCanvas.tsx` 中重新堆长串命中判断
- 在根目录恢复旧式 helper/config 聚合文件

## Maintenance Guidelines

新增标注能力时，优先按以下方式扩展：

1. 如果是新的辅助图形，放到 `support-shape-renderers/`
2. 如果是新的医学测量工具，放到 `annotation-tool-renderers/`
3. 在 `renderMeasurement.tsx` 中注册映射
4. 在 `catalog/annotation-catalog.ts` 中补齐定义
5. 如果涉及命中或 bounds，补 `hitTestMeasurement.ts` 和 `selectionBox.ts`
6. 如果涉及值计算，补 `domain/annotation-calculation.ts`
