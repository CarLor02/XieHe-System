# 影像标注手动测量工具职责

手动测量工具拆为公共领域规则和 Web 注册/交互两部分。整体 workspace 边界见
[`shared-imaging-core.md`](./shared-imaging-core.md)。

## 目录结构

```text
packages/xiehe-imaging-core/src/measurements/
├── domain/
│   ├── manual-tools/
│   │   ├── ap/                     # 正位工具规则
│   │   └── lateral/                # 侧位工具规则
│   ├── cobb/                       # 正侧位共用的 Cobb 基础规则
│   ├── resolver/                   # 可变 measurement 解析注册表
│   ├── annotation-rules/           # 唯一性、可编辑性和序列化
│   └── tool-catalog/               # 跨端工具能力与检查类型清单
└── application/                    # 应用端口与纯用例

frontend/.../features/measurements/
├── catalog/                        # Web 工具注册与视觉元数据
└── application/                    # React hooks 和跨状态/API 用例
```

## Core 工具规则

- 保存测量公式、固定点序、正负号、医学约束、纯几何和命中规则。
- 复杂工具按职责拆分 calculation、geometry、hit-testing、interaction、resolver、
  point-layout 和 types，不为形式统一创建空文件。
- 公开函数必须说明点序与符号语义；历史格式兼容分支必须用中文注释说明来源。
- 不得依赖 React、Web catalog、SVG renderer、API、DOM 或画布状态。

### 手动点位放置约束

手动工具“下一点是否吸附到水平线”等平台无关规则由
`measurement-keypoint-sync` 的点位解析入口统一处理。调用方提交工具 ID、继承槽位、
已点击点和原始坐标，core 返回真实 measurement point index 与最终坐标。

- Web 和 Expo 不得按工具 ID 自行改写坐标。
- TTS 仅约束躯干线 `points[1]` 相对 `points[0]` 水平。
- TTS 的 `points[2]/[3]` 是 SL/SR，TS 的全部六点均为自由解剖点。
- AVT 椎间盘线和辅助水平/垂直线继续使用各自的 core 专用交互规则。

### 可变布局 resolver

Cobb、AVT、TTS、PI/PT/TPA 的持久化点序受检查类型、metadata 或历史版本影响，
必须通过 `resolveVariableMeasurement(measurement, { examType })` 解析：

- `not-applicable`：固定布局工具。
- `resolved`：返回工具专用强类型几何和交互语义。
- `invalid`：数据布局损坏；保留原记录，但不允许绘制、命中、拖动或自动重算。

侧位命名 Cobb、S1 特殊端椎和通用侧位 Cobb 各自拥有 resolver；AP 与侧位先按
检查类型隔离。创建、重算、删除依赖和关键点同步消费同一个 resolver，不允许在
调用方重新拼接点下标。

骨盆 resolver 支持 PI/PT 三点与六点、TPA 七点与十点，以及有注释的历史兼容
布局。`effectiveCFH` 由单 CFH 或双 FH 几何统一提供。

## Web Catalog

Core `tool-catalog` 负责工具 ID、检查类型适用性、有序清单、点数、结果分类、工具栏
分组和 Canvas 交互类别。Web catalog 只负责：

- 中文名、图标、描述、颜色和 renderer 等展示元数据。
- 标签锚点、屏幕偏移、交互点数和 renderer ID。
- 将 core 计算/命中函数组合为 Web `AnnotationConfig`。

Catalog 不实现医学公式，也不自行维护跨平台工具清单。Expo 应建立符合移动端交互
的展示 catalog，并复用 Core 能力目录、规则和契约。

## 依赖方向

```text
Web application / catalog / canvas presentation
                    |
                    v
 @xiehe/imaging-core/measurements/{ap,lateral}
                    |
                    v
       contracts + anatomy + geometry
```

新增工具时先在 core 确定点序、公式、resolver 和测试，再接入 Web/Expo catalog、
输入流程和 renderer。不得让 core 引用任一平台实现。
