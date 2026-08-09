# 影像标注画布职责

Canvas 由公共规则、公共派生状态和 Web 交互/展示实现组成。

## 目录结构

```text
packages/xiehe-imaging-core/src/canvas/
├── domain/
│   ├── input/       # 指针设备策略与双指缩放数学
│   ├── model/       # 选择、悬浮、绘制和视口值对象
│   ├── transform/   # 图像坐标与视口坐标转换
│   ├── hit-test/    # 基础图形命中
│   ├── selection/   # measurement 选择边界
│   └── tools/       # 工具切换、点约束和参考线规则
└── application/
    └── selectors/   # 平台无关画布派生状态

frontend/.../features/annotation-canvas/
├── application/
│   ├── hit-test/    # 组合 Web catalog/标签信息的命中流程
│   └── hooks/       # React 拖拽、绘制和选择状态
└── presentation/
    ├── hooks/       # DOM Pointer Events、Capture、ResizeObserver
    ├── layers/
    ├── panels/
    └── renderers/
```

## 输入与坐标

```text
React.PointerEvent
  -> presentation/useCanvasPointerEvents
  -> core CanvasPointerInput/CanvasPointerPolicy
  -> Web application hooks
  -> core hit-test / viewport transform
```

Presentation 负责 DOM 相对坐标、活动 pointerId、Pointer Capture、多指生命周期和
容器尺寸。Core 只接收规范化输入；鼠标和触控笔可以 hover，触摸使用更大命中半径
且不模拟 hover。坐标转换显式接收图像尺寸、容器尺寸、缩放和平移。

## 派生状态与 Renderer

`buildCanvasDerivedState` 位于 Core application，接收最小工具描述
`{ id, pointsNeeded }`，负责当前工具、有效待点数、可见测量项和 hover 排序。它不
依赖 React、图标、中文文案或 renderer。

文字标签命中依赖字体估算和 Web catalog，完整 measurement 命中还要组合 Web
renderer 配置，因此留在 Web application。Web catalog 只声明 `rendererId`，
presentation registry 将其映射到 JSX。Core 不返回 JSX，也不解释 SVG 或 DOM。

可变 measurement 必须先经 Core resolver 解析。`invalid` 记录保留在列表中，但
renderer、hit-test 和 drag 跳过，Canvas 不按 `points.length` 猜测历史布局。

## 边界约束

- Core canvas domain 只依赖 domain；application 只依赖 domain/application。
- Web application 不依赖 presentation。
- Pointer Capture、DOM 尺寸和浏览器事件只存在于 Web presentation。
- Measurement/Core 不反向依赖 Canvas renderer。
- Expo 复用 Core 输入策略、selector 和几何，自行实现 Gesture/Skia 适配。
