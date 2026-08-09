# 测量项与关键点同步模块

`measurement-keypoint-sync` 是关键点与测量项之间的防腐层，领域依赖和应用编排
均已进入公共 Core；Web 只保留 React 状态、日志和交互时机。

## 目录结构

```text
packages/xiehe-imaging-core/src/measurement-keypoint-sync/
├── domain/
│   ├── *-binding-rule.ts                 # AP、侧位、AVT、骨盆绑定
│   ├── measurement-keypoint-*.ts         # 查询、选择、写回和双向绑定
│   ├── manual-measurement-inheritance.ts # 手动工具继承已有关键点
│   ├── deletion/                         # 精确依赖图与纯删除计划
│   └── vertebrae-derive.ts               # 椎体层测量候选推导
└── application/
    ├── usecases/                         # 创建、派生、重算和同步
    └── *UseCase.ts                       # 恢复、Cobb 写回等应用流程

frontend/.../features/measurement-keypoint-sync/application/
└── hooks/                                # React 跨 feature 状态编排
```

## 职责边界

- Domain 定义点位依赖、端椎查询、手动点继承、写回和删除计划。
- Application 组合领域规则，创建或重算 Cobb、AVT、TTS、骨盆及固定测量项。
- 所有数值计算通过 `MeasurementValueCalculator` 端口注入，应用用例不读取 Web
  catalog，也不产生 UI 错误文案。
- 派生失败通过可选回调交给 Web logger；Core 不依赖具体日志实现。
- React hooks 只决定何时执行 AI 初始派生、拖动重算和关键点增删同步。

## 依赖方向

```text
Web hooks/adapters
       |
       v
Core sync application -----> measurements application port
       |                              |
       v                              v
Core sync domain        Core measurements/keypoints domain
```

领域模块不能导入 application 或上下文公开 facade。应用模块可依赖领域、端口和
其他平台无关应用流程；公开调用方仍使用
`@xiehe/imaging-core/measurement-keypoint-sync`。
