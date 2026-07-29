# 影像标注画布目录与职责

`features/annotation-canvas` 是图像视口、统一指针交互和 SVG 标注展示的边界。
它可以消费测量、关键点和绑定 feature 的公开能力，但这些 feature 不得反向
依赖画布实现。

## 目录结构

```text
annotation-canvas/
├── domain/
│   ├── hit-test/       # 与具体 measurement 无关的几何命中
│   ├── input/          # 输入设备策略与双指缩放纯几何
│   ├── model/          # 选择、悬浮、绘制和坐标转换模型
│   ├── tools/          # 工具切换、点约束和参考线保留规则
│   └── transform/      # 纯图像坐标与视口坐标转换
├── application/
│   ├── hit-test/       # 组合 measurement 元数据的命中流程
│   ├── hooks/          # 设备无关的拖拽、绘制、检测点和标准距离状态编排
│   └── selectors/      # 无副作用的画布 view-model 计算
├── presentation/
│   ├── AnnotationCanvas.tsx
│   ├── hooks/          # Pointer Events 适配、Pointer Capture、controller 和 viewport
│   ├── layers/
│   ├── panels/
│   └── renderers/
└── index.ts
```

`AnnotationCanvas.tsx` 只创建 controller 并组合 layer/panel。业务命令、
选择状态和拖拽流程集中在 controller 及 application hooks，子组件不直接修改
页面级 annotation state。

## 输入事件

画布只绑定 Pointer Events，不并行维护 mouse/touch 两套事件链：

```text
React.PointerEvent
  -> presentation/useCanvasPointerEvents
  -> domain/input/CanvasPointerInput
  -> application hooks
  -> domain hit-test / viewport transform
```

- presentation 负责 DOM 相对坐标、活动 `pointerId`、Pointer Capture 和多指生命周期。
- domain 的输入策略声明不同设备的命中半径、拖动阈值和 hover 能力。
- application 只接收规范化输入，不读取 `button`、`buttons` 或浏览器事件。
- 鼠标和支持悬停的触摸笔保留 hover；触摸按下直接选中，不模拟 hover。
- 双指缩放只在移动工具且标注拖动尚未开始时接管。缩放结束前不恢复剩余单指，
  防止画面跳动。
- `pointerleave` 只清理 hover。拖拽完成边界是捕获指针的
  `pointerup`、`pointercancel` 或 `lostpointercapture`。

图像和 SVG 图层位于带 `touch-action: none` 的独立 interaction surface；
结果列表、控制面板和弹窗是其兄弟节点，因此触摸滚动面板不会被画布手势拦截。

## 坐标转换

domain 坐标转换必须显式接收图像尺寸、容器尺寸、缩放和平移，不得查询 DOM。
presentation viewport 通过 `ResizeObserver` 读取容器尺寸，再构造
`TransformContext`。浏览器画布、导出和测试因此使用同一套转换规则。

## Renderer 依赖反转

Measurement catalog 只声明 `rendererId`，不保存 JSX 回调：

```text
measurements catalog -- rendererId --> annotation-canvas renderer registry
measurements catalog <---------------- annotation-canvas presentation
```

`special-annotation-renderer-registry.tsx` 用完整的
`Record<AnnotationRendererId, AnnotationRenderer>` 注册 JSX 实现。新增
renderer ID 如果没有对应实现，TypeScript 必须报错。正式标注和绘制预览都通过
该注册表分发，禁止重新从 catalog import canvas renderer。

## 边界约束

- domain 不得依赖 React、DOM、application 或 presentation。
- application 不得依赖 presentation。
- 原始 Pointer Events、Pointer Capture 和 DOM 尺寸读取只能出现在 presentation。
- measurements 不得依赖 annotation-canvas。
- viewer 外部只能通过 `annotation-canvas/index.ts` 使用公开入口。
