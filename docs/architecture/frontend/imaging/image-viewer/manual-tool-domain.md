# 影像标注手动测量工具目录与职责

本文说明
`frontend/app/imaging/features/image-viewer/features/measurements/`
中手动测量工具的领域结构。目标是把医学计算规则、应用流程和画布展示分开，
避免工具公式重新堆积到 catalog 或 React 组件中。

## 目录结构

```text
measurements/
├── catalog/
│   ├── ap/measurements/             # 正位工具注册与展示适配
│   ├── lateral/measurements/        # 侧位工具注册与展示适配
│   ├── auxiliary/                   # 辅助图形注册
│   └── shared/
│       ├── annotation-config.ts     # 工具注册表与查询
│       ├── annotation-config-types.ts
│       ├── annotation-metadata.ts   # 标签、颜色和交互元数据
│       └── label-layout.ts          # 标签屏幕偏移
├── domain/
│   ├── annotation-type-id.ts        # 稳定工具 key 规范化
│   └── measurement-calculation-types.ts
├── manual-tools/domain/
│   ├── ap/                          # 仅正位工具规则
│   ├── lateral/                     # 仅侧位工具规则
│   ├── shared/                      # 正侧位真正共用的纯规则
│   └── measurement-resolver.ts      # 可变点位布局的唯一解析注册表
└── application/
    ├── hooks/                       # 测量领域的 React 状态适配
    └── usecases/                    # 跨工具、状态或 catalog 的应用流程
```

`manual-tools/domain/ap` 与 `manual-tools/domain/lateral` 按工具名建目录。
简单工具可以只使用 `index.ts`；复杂工具按需要拆分
`calculation.ts`、`geometry.ts`、`hit-testing.ts`、`interaction.ts`、
`point-layout-rules.ts` 和 `types.ts`，不要求创建空文件凑齐结构。

## 文件职责

### `manual-tools/domain`

- 保存测量公式、点位布局、正负号、命中范围和医学约束等纯规则。
- 只能依赖稳定类型、同层领域模块和 `image-viewer/shared`。
- 不得依赖 catalog、React、SVG renderer、hook、API 或画布状态。
- 公开函数需要用中文说明输入点序和正负号；历史格式兼容分支必须标明原因。

### 可变布局 resolver

Cobb、AVT、TTS、PI/PT/TPA 的持久化点序会受到检查类型、metadata 或历史版本
影响，必须先通过 `resolveVariableMeasurement(measurement, { examType })`
解析。该入口返回三态：

- `not-applicable`：固定布局工具，不需要 resolver。
- `resolved`：返回工具专用的强类型几何和交互点语义。
- `invalid`：已识别工具的数据布局损坏；保留原 measurement 和已保存 value，
  但不得绘制、命中、拖动或自动重算。

Resolver 只在运行时解释现有 `MeasurementData`，不修改 annotation JSON。
固定两点/四点工具不为形式统一而增加 resolver。

Cobb resolver 先按 `examType` 隔离 AP 与侧位，再按以下优先级匹配侧位规则：

1. 每个命名 Cobb 的独立 resolver。
2. 下端椎为 S1 的特殊 resolver。
3. 普通侧位 Cobb resolver。

因此历史侧位 `cobbN` 也会根据当前检查类型使用侧位规则，而不会误用 AP
端椎语义。创建、重算、删除依赖和关键点同步必须消费同一 resolver，禁止重新
拼接端椎关键点 ID。

骨盆 resolver 明确支持 PI/PT 的三点/六点、TPA 的七点/十点，以及历史
“bilateral metadata + 七点 TPA”。最后一种布局保存的是
`[T1四角,effectiveCFH,S1-1,S1-2]`，不得静默升级为十点双圆结构。

### `manual-tools/domain/shared`

- `geometry/`：向量角、水平角、中心点、点到线段距离。
- `hit-testing/`：点和线段的通用命中规则。
- `calibration/`：像素距离到毫米的标定换算。
- `pelvic/`：股骨头中心、S1 中点和骶骨法线。
- `cobb/`：双终板夹角、命中和编号规则。
- `line-angle/`：两点水平角工具的计算模板。

只有正位和侧位语义完全一致的规则才能进入 shared。终板选取、关键点点序、
特殊端椎和符号约定仍由 AP 或 lateral 工具包装，不能通过复用 catalog config
来跨检查类型共享。

### `catalog`

Catalog 是工具注册和展示适配层，只负责：

- 工具 ID、名称、图标、描述、点数、颜色和分类。
- 标签锚点、标签偏移及其他画布展示参数。
- 将 domain 的计算、命中函数和强类型 `rendererId` 组合为
  `AnnotationConfig`，但不依赖 React 或具体 canvas renderer。

Catalog 不实现医学公式，不作为其他领域模块的工具函数仓库。新增工具时，
应先建立 domain 规则，再由 catalog 引用。

### `application/usecases`

需要访问 catalog、多个测量项或 React 状态之外的应用流程放在 use case，例如：

- 根据工具类型分派测量公式。
- 删除 Cobb 后重编号并重算 value。
- 创建跨测量项的继承绑定。

领域层只返回确定的规则结果；是否写回列表、如何合并状态和何时调用由 use case
负责。

### `annotation-canvas`

Canvas renderer 只根据已经确定的点位和测量结果绘制 SVG。渲染器可以读取纯几何
结果辅助绘制，但不得重新实现测量公式，也不得让 domain 返回 JSX。

## 依赖方向

```text
application/usecases / application/hooks / annotation-canvas
                ↓
              catalog
                ↓
manual-tools/domain/ap | lateral
                ↓
   manual-tools/domain/shared
                ↓
measurements/domain + image-viewer/shared
```

禁止 `manual-tools/domain -> catalog`、`manual-tools/domain -> annotation-canvas`
以及 `manual-tools/domain -> React`。可使用以下命令检查：

```bash
rg "from .*catalog|from .*annotation-canvas|from 'react'" \
  frontend/app/imaging/features/image-viewer/features/measurements/manual-tools/domain
```

## 新工具接入步骤

1. 确定工具属于 AP、lateral 或 shared，并记录固定点序；可变或版本化点序必须建立 resolver。
2. 在对应工具目录实现纯计算与必要的几何、命中规则。
3. 为点数不足、符号方向、退化几何和历史格式补单元测试。
4. 在 catalog 中只添加元数据、标签布局、领域函数引用和 `rendererId`。
5. 若工具需要关键点绑定或继承，通过 use case 接入，不把状态写回放进计算函数。
