# 影像标注画布职责

Canvas 由公共纯规则和 Web 交互/展示实现组成。

## 目录结构

```text
packages/xiehe-imaging-core/src/canvas/
├── input/       # 指针设备策略与双指缩放数学
├── model/       # 选择、悬浮、绘制和视口值对象
├── transform/   # 图像坐标与视口坐标转换
├── hit-test/    # 基础图形命中
├── selection/   # measurement 选择边界
└── tools/       # 工具切换、点约束和参考线保留规则

frontend/.../features/annotation-canvas/
├── application/
│   ├── hit-test/   # 组合 Web catalog/标签信息的命中流程
│   ├── hooks/      # React 拖拽、绘制和选择状态
│   └── selectors/
└── presentation/
    ├── hooks/      # DOM Pointer Events、Capture、ResizeObserver
    ├── layers/
    ├── panels/
    └── renderers/
```

## 输入与坐标

Web 只绑定 Pointer Events，不维护独立 mouse/touch 链：

```text
React.PointerEvent
  -> presentation/useCanvasPointerEvents
  -> core CanvasPointerInput/CanvasPointerPolicy
  -> Web application hooks
  -> core hit-test / viewport transform
```

Presentation 负责 DOM 相对坐标、活动 pointerId、Pointer Capture、多指生命周期和
容器尺寸。Core 只接收规范化输入；鼠标/触摸笔可以 hover，触摸使用更大命中半径且
不模拟 hover。双指缩放仅计算视口结果，不读取 DOM。

坐标转换显式接收图像尺寸、容器尺寸、缩放和平移，因此 Web、Expo 和测试可复用
同一规则。

## Web 专属命中与 Renderer

文字标签命中依赖字体估算和 Web catalog 元数据，完整 measurement 命中还要组合
renderer/交互点配置，因此保留在 Web application。基础点、线、圆、椭圆、多边形
命中以及选择边界位于 core。

Web catalog 只声明 `rendererId`，Canvas presentation 的完整 registry 将其映射到
JSX。Core 不返回 JSX，也不解释字体、SVG 或 DOM。

可变 measurement 必须先经 core resolver 解析。`invalid` 记录保留在列表中，但
renderer、hit-test 和 drag 均跳过，Canvas 不再按 `points.length` 猜测历史布局。

## 边界约束

- Core canvas 不依赖 React、React Native、DOM、application 或 presentation。
- Web application 不依赖 presentation。
- Pointer Capture、DOM 尺寸和原始浏览器事件只存在于 Web presentation。
- Measurement/core 不反向依赖 Canvas renderer。
- Expo 复用 core 输入策略和几何，但自行实现 Gesture/Skia 适配。
