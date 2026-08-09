# Web 与移动端共享影像规则

## 目标

仓库使用 npm workspaces 管理三个 JavaScript/TypeScript 工作区：

```text
frontend/                       # Next.js Web 应用
mobile-expo/                    # React Native + Expo 新移动端
packages/xiehe-imaging-core/    # 平台无关影像领域规则
```

旧 `mobile/` KMP 工程保持原状，不参与 npm workspace，也不作为新功能的规则来源。
新端不得从 `frontend/` 深层导入代码；Web 与 Expo 只能通过
`@xiehe/imaging-core` 的公开子路径共享规则。

## Core 目录职责

```text
packages/xiehe-imaging-core/src/
├── contracts/                  # 标注、点位、AVT、骨盆等稳定数据契约
├── anatomy/                    # 检查类型和椎体生理顺序
├── geometry/                   # 平台无关几何与命中基础函数
├── keypoints/                  # 关键点 catalog、转换和纠正规则
├── measurements/
│   ├── annotation-rules/       # 唯一性、可编辑性和序列化
│   ├── cobb/                   # Cobb 共享计算、命中和编号
│   ├── manual-tools/           # AP/侧位手动工具领域规则
│   └── resolver/               # 可变历史点序的统一解析入口
├── measurement-keypoint-sync/ # 双向绑定、删除计划、派生和纯应用流程
├── bindings/                   # 用户手动点绑定及历史 schema 迁移
└── canvas/                     # 输入策略、坐标变换、纯命中和选择边界
```

Core 必须保持纯 TypeScript，不得依赖 React、React Native、Next.js、DOM、浏览器
存储或平台绘图库。`tests/platform-boundaries.test.ts` 会扫描这些禁止依赖。

## 公开入口

调用方应使用 `package.json` 声明的稳定子路径：

```ts
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { getMeasurementDeriveVertebraOrder } from '@xiehe/imaging-core/anatomy';
import { resolveVariableMeasurement } from '@xiehe/imaging-core/measurements';
import { getKeypointGroupsForExamType } from '@xiehe/imaging-core/keypoints';
import { planMeasurementDeletion } from '@xiehe/imaging-core/measurement-keypoint-sync';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
```

Core 内部使用相对导入，不通过自身包名回流 barrel。这样可避免循环初始化，也让
单元测试 mock 平台入口时不会污染领域模块的构造过程。

## Web 保留职责

以下内容刻意保留在 `frontend/app/imaging/features/image-viewer/`：

- `measurements/catalog/`：工具中文名、图标、颜色、renderer ID、标签位置和 Web
  工具清单。Expo 会建立自己的展示 catalog，不复用 Web 视觉元数据。
- React hooks 与需要页面状态、历史记录、API 或持久化的 application use case。
- SVG renderer、DOM/Pointer Events 适配、Overlay、面板和工具栏。
- AI HTTP 调用、报告、影像加载与 Web 本地缓存。
- 依赖 Web catalog 进行公式分发或标签文本测量的适配流程。

Catalog 可以组合 core 的计算函数，但不得重新实现医学公式。Core 也不得反向依赖
catalog 或 renderer。

## Canvas 平台边界

Core canvas 接收规范化的坐标、尺寸和指针类型，只计算策略与几何：

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

Pointer Capture、DOM 相对坐标和 `ResizeObserver` 留在 Web；Expo 需要实现对应的
手势生命周期和绘制层，但复用相同命中半径策略、拖拽阈值、pinch 数学和坐标变换。

## 迁移批次

本轮按依赖由底向上迁移，且每批后验证 Web：

1. npm workspace、Expo 57 骨架和 core 平台边界测试。
2. 数据契约、检查类型、椎体顺序与共享几何。
3. AP、侧位工具计算及可变 measurement resolver。
4. 关键点 catalog、映射与纠正。
5. 测量项-关键点同步领域、删除计划和纯应用流程。
6. 平台无关 Canvas 规则。
7. 手动绑定、椎体层测量派生和标注生命周期规则。

迁移后的 Web 不保留旧领域模块 re-export；调用方必须改用 core 公开入口，避免两套
实现长期分叉。

## 验证

在仓库根目录运行：

```bash
npm run verify:core
npm run type-check:web
npm run test:web
npm run build:web
npm run type-check:mobile
```

Core 使用 Vitest，Web 保持 Jest。测试文件随其业务规则迁移，Core 与 Web 测试数
之和应保持稳定。涉及 Expo 页面或原生依赖后，再增加 Expo export、设备端手势和
Skia renderer 的专项测试。
