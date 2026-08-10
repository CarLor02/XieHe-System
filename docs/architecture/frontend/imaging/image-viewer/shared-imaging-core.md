# Web 与移动端共享影像规则

## 目标

仓库使用 npm workspaces 管理三个 JavaScript/TypeScript 工作区：

```text
frontend/                       # Next.js Web 应用
mobile-expo/                    # React Native + Expo 新移动端
packages/xiehe-imaging-core/    # 平台无关影像规则
```

旧 `mobile/` KMP 工程保持原状，不参与 npm workspace。Web 与 Expo 不得相互深层
导入，只能通过 `@xiehe/imaging-core` 的公开入口共享规则。

## Core 目录职责

```text
packages/xiehe-imaging-core/src/
├── ai/
│   ├── domain/                 # AI 响应契约
│   └── application/            # 正侧位关键点与测量结果归一化
├── annotation-document/domain/ # 版本化标注快照、历史解码与坐标缩放
├── shared/domain/
│   ├── contracts/              # 标注、点位、AVT、骨盆等稳定契约
│   ├── anatomy/                # 检查类型与椎体生理顺序
│   └── geometry/               # 平台无关几何
├── measurements/
│   ├── domain/                 # 公式、resolver、工具能力目录和手动工具规则
│   └── application/
│       ├── ports/              # MeasurementValueCalculator 等依赖端口
│       └── usecases/           # 测量创建计划与 Cobb 删除后重编号
├── keypoints/domain/           # 关键点 catalog、映射和纠正
├── measurement-keypoint-sync/
│   ├── domain/                 # 绑定、继承、依赖图与删除规则
│   └── application/            # 创建、派生、重算和持久化恢复
├── bindings/domain/            # 用户绑定及历史 schema 迁移
└── canvas/
    ├── domain/                 # 输入、坐标、命中、选择和工具策略
    └── application/selectors/  # 平台无关画布派生状态
```

`domain` 不依赖 application 或上下文 facade；`application` 只依赖领域、应用端口和
平台无关应用流程。Core 内部全部使用相对导入，不通过自身包名回流公开 barrel。
边界测试会拒绝 React、React Native、Next.js、Expo、DOM、浏览器存储、Web `@/`
别名和越层依赖。

## 公开入口

调用方使用 `package.json` 中声明的稳定子路径：

```ts
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { decodeAnnotationDocument } from '@xiehe/imaging-core/annotation-document';
import { normalizeAiDetectionResult } from '@xiehe/imaging-core/ai';
import { getMeasurementDeriveVertebraOrder } from '@xiehe/imaging-core/anatomy';
import { calculateMeasurementResults } from '@xiehe/imaging-core/measurements';
import { getToolIdsForExamType } from '@xiehe/imaging-core/measurements';
import { getKeypointGroupsForExamType } from '@xiehe/imaging-core/keypoints';
import { planMeasurementDeletion } from '@xiehe/imaging-core/measurement-keypoint-sync';
import { buildCanvasDerivedState } from '@xiehe/imaging-core/canvas';
```

公开子路径保持稳定；DDD 目录是 Core 内部组织，不要求平台调用方深层导入。

## 计算与应用边界

测量公式分发由 Core 完成，并返回 `calculated`、`unsupported` 或 `invalid` 的结构化
结果。Core 不生成中文错误文案，也不决定 UI fallback。Web 的薄适配器负责把结果
转换为现有列表文案和日志行为。

同步应用用例通过 `MeasurementValueCalculator` 端口获取数值，不反向依赖 Web
catalog。测量新增使用纯 `planMeasurementAddition` 生成计划，Web 只负责 React
状态提交。工具能力目录统一声明工具 ID、有序检查类型清单、点数、结果分类、工具栏
分组和交互类别；Web/Expo 分别组合自己的文案、图标与 renderer。画布 selector 只
依赖这些稳定字段，不依赖展示文案。

AI HTTP 仍由平台发起，但响应到图像坐标、正位姿态点交换、侧位角点几何排序、弯曲
位过滤和 Cobb 元数据生成由 Core application 完成。版本化标注文档由 Core 负责
构建、解码和原图坐标缩放；平台只决定保存到 API、SecureStore 或本地维护缓存。

## 平台保留职责

以下能力留在 Web 或 Expo：

- 工具中文名、图标、颜色、renderer ID 和平台展示 catalog。
- React hooks、历史状态、API、持久化、日志和用户消息。
- DOM Pointer Events、SVG renderer、Overlay、面板和工具栏。
- AI HTTP、报告、影像加载与具体存储介质。

平台 catalog 可以组合 Core 公式，但不得重新实现医学计算；Core 不得反向依赖
catalog、renderer 或平台状态。

## Canvas 平台边界

```text
Web React.PointerEvent          Expo Gesture/Skia event
            \                    /
             平台输入适配层
                    |
                    v
     @xiehe/imaging-core/canvas
                    |
                    v
          平台状态与 renderer
```

Pointer Capture、DOM 相对坐标和 `ResizeObserver` 留在 Web。Expo 实现自己的手势
生命周期和绘制层，复用 Core 的命中策略、拖拽阈值、缩放数学与坐标转换。

## 验证

在仓库根目录运行：

```bash
npm run type-check:core
npm run test:core
npm run type-check:web
npm run test:web
npm run build:web
npm run type-check:mobile
npm run export:mobile
```
