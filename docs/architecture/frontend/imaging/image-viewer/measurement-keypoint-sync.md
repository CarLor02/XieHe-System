# 测量项与关键点同步模块

`measurement-keypoint-sync` 是关键点与测量项之间的防腐层。纯规则位于 core，
React 状态编排和依赖 Web 计算 catalog 的流程留在 Web。

## 目录结构

```text
packages/xiehe-imaging-core/src/measurement-keypoint-sync/
├── *-binding-rule.ts             # AP、侧位、AVT、骨盆绑定规则
├── measurement-keypoint-*.ts     # 查询、选择、写回和双向绑定
├── deletion/                     # 精确依赖图与纯删除计划器
├── vertebrae-derive.ts           # AI 椎体层到测量候选项推导
└── application/                  # 不依赖 React/API 的纯应用流程

frontend/.../features/measurement-keypoint-sync/application/
├── hooks/                        # React 跨 feature 状态编排
└── usecases/                     # 依赖 Web 计算 catalog 的创建与同步流程
```

## 职责边界

- Core 定义点位依赖、端椎查询、写回、删除计划、测量候选派生和持久化恢复。
- Cobb 创建、重算、删除和写回统一消费 AP/侧位 resolver，不维护第二份下标规则。
- Web `createBoundMeasurementUseCase` 负责调用 Web 计算 catalog 后写入页面状态。
- Web `synchronizeMeasurementsUseCase` 组合 core 候选项与 Web value 计算、唯一性和
  React 流程；领域推导失败通过回调交给 Web logger。
- React hooks 只决定何时执行 AI 初始派生、拖动重算和关键点增删同步。

## 依赖方向

```text
Web hooks/usecases
       |
       v
@xiehe/imaging-core/measurement-keypoint-sync
       |                         |
       v                         v
core keypoints             core measurements
```

关键点和测量项基础模块彼此不直接引用；同时理解两者语义的规则进入 sync。Core
内部使用相对导入，平台调用方使用公开子路径。
