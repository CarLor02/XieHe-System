# 影像标注画布目录与职责

`features/annotation-canvas` 是图像视口、鼠标交互和 SVG 标注展示的边界。
它可以消费测量、关键点和绑定 feature 的公开能力，但这些 feature 不得反向
依赖画布实现。

## 目录结构

```text
annotation-canvas/
├── domain/
│   ├── hit-test/       # 与具体 measurement 无关的几何命中
│   ├── model/          # 选择、悬浮、绘制和坐标转换模型
│   ├── tools/          # 工具切换、点约束和参考线保留规则
│   └── transform/      # 纯图像坐标与视口坐标转换
├── application/
│   ├── hit-test/       # 组合 measurement 元数据的命中流程
│   ├── hooks/          # 拖拽、绘制、检测点和标准距离状态编排
│   └── selectors/      # 无副作用的画布 view-model 计算
├── presentation/
│   ├── AnnotationCanvas.tsx
│   ├── hooks/          # presenter controller、DOM 事件和 viewport
│   ├── layers/
│   ├── panels/
│   └── renderers/
└── index.ts
```

`AnnotationCanvas.tsx` 只创建 controller 并组合 layer/panel。业务命令、
选择状态和拖拽流程集中在 controller 及 application hooks，子组件不直接修改
页面级 annotation state。

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
- measurements 不得依赖 annotation-canvas。
- viewer 外部只能通过 `annotation-canvas/index.ts` 使用公开入口。
