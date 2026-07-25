# 测量项与关键点同步模块

`measurement-keypoint-sync` 是 `keypoints` 与 `measurements` 两个领域之间的
防腐层。它负责双向绑定、派生、重算和写回；两个基础 feature 保持同级，且彼此
不直接依赖。

## 目录结构

```text
measurement-keypoint-sync/
├── domain/
│   ├── measurement-derive.ts
│   ├── measurement-keypoint-binding.ts
│   ├── measurement-keypoint-query.ts
│   ├── measurement-keypoint-selection.ts
│   ├── measurement-keypoint-writeback.ts
│   └── vertebrae-derive.ts
├── application/
│   ├── hooks/
│   │   ├── useMeasurementKeypointWorkflow.ts
│   │   └── useMeasurementWorkflow.ts
│   └── usecases/
│       ├── cobbKeypointSyncUseCase.ts
│       ├── createBoundMeasurementUseCase.ts
│       ├── shiftMeasurementVertebraLabelsUseCase.ts
│       └── synchronizeMeasurementsUseCase.ts
└── index.ts
```

## 职责边界

- `domain/` 保存不依赖 React 的双领域纯规则，包括绑定表、端椎查询、选择映射、
  点位写回和自动测量候选派生。
- `createBoundMeasurementUseCase.ts` 只负责从关键点构造或重建绑定测量项。
- `synchronizeMeasurementsUseCase.ts` 明确区分三个入口：
  - AI 检测后允许执行完整初始派生，包括 Cobb。
  - 点位移动后只重算内存中已有或已绑定的测量项。
  - 关键点增删后可补齐全局唯一测量项，但不会自动恢复 Cobb。
- `application/hooks/` 负责把上述规则接入 React 状态和用户操作，不重新实现
  领域映射。

## 依赖方向

```text
image-viewer application / UI
             |
             v
measurement-keypoint-sync
        /             \
       v               v
  keypoints       measurements
       \               /
        v             v
       image-viewer/shared
```

约束：

1. `keypoints` 不得导入 `measurements` 或 `measurement-keypoint-sync`。
2. `measurements` 不得导入 `keypoints` 或 `measurement-keypoint-sync`。
3. 同时需要两类领域数据的代码必须放入本模块。
4. 模块外调用统一通过各 feature 的 `index.ts`，避免依赖内部目录。
5. `features/feature-boundaries.test.ts` 自动检查前两条依赖规则。
