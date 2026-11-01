# 影像标注画布职责

Canvas 由公共规则、公共派生状态、公共绘制几何和各平台交互/展示实现组成。

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
    ├── drawing/measurement-drawing/ # 平台无关的辅助线、箭头、弧线与图元
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
presentation registry 将其映射到 JSX。Core 不返回 JSX，也不访问 DOM；SVG 属性由平台适配。

`buildMeasurementDrawing`、`buildAvtDrawing` 接收影像点位、布局解析结果和投影函数，
返回直线、圆、弧、箭头多边形等纯数据图元。辅助线长度使用影像坐标；箭头和弧线半径
使用屏幕坐标。Web 的 `renderDrawingPrimitives` 和 Expo 的 `DrawingPrimitives`
分别映射到 DOM SVG 和 `react-native-svg`，避免两端各自维护长度和位置规则。
AVT 使用 metadata 区分椎体/椎间盘、C7PL/CSVL，历史两点/六点记录保持原有布局。

Expo 的动态 SVG 边界同样从图元计算，包含弧线和箭头，防止拖动时被局部位图裁剪。
测量文字仍由低频读数层渲染；静态/动态几何分层和 UI 线程控制点预览保持独立。

完成测量绘制或显式补点后，应用层先写回关键点，再调用
`deriveMissingFixedMeasurementsFromKeypoints` 补齐可确定的固定测量。例如 TTS 的
骶骨参考点满足 CSS 时自动创建 CSS，PI 完成后补齐 PT、SS。拖动仅重算已有项，
不重新创建已删除的测量；新建测量、关联关键点和自动派生项纳入同一次撤销事务。

可变 measurement 必须先经 Core resolver 解析。`invalid` 记录保留在列表中，但
renderer、hit-test 和 drag 跳过，Canvas 不按 `points.length` 猜测历史布局。

## 边界约束

- Core canvas domain 只依赖 domain；application 只依赖 domain/application。
- Web application 不依赖 presentation。
- Pointer Capture、DOM 尺寸和浏览器事件只存在于 Web presentation。
- Measurement/Core 不反向依赖 Canvas renderer。
- Expo 复用 Core 输入策略、selector 和绘制几何，自行实现 Gesture、Reanimated 和原生 SVG 适配。
