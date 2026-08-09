# @xiehe/imaging-core

Web 与 React Native 共用的影像标注规则包。该包是仓库内部 npm workspace，
不发布到 npm registry，也不依赖 React、DOM、SVG、Skia 或平台存储。

## 分层

```text
src/
├── shared/domain/                  # 跨上下文契约、解剖顺序和几何
├── measurements/
│   ├── domain/                     # 测量公式、resolver、工具规则
│   └── application/                # 计算端口与纯测量用例
├── keypoints/domain/               # 关键点 catalog、转换和纠正
├── measurement-keypoint-sync/
│   ├── domain/                     # 双向绑定、依赖图、删除与继承规则
│   └── application/                # 创建、派生、重算和恢复用例
├── bindings/domain/                # 手动标注绑定与历史 schema 迁移
└── canvas/
    ├── domain/                     # 输入、坐标、命中和工具策略
    └── application/                # 平台无关画布 selector
```

`domain` 只能依赖其他领域模块；`application` 只能依赖领域模块、应用端口和其他
平台无关应用流程。Web/Expo 通过 `package.json` 中的公开子路径使用能力，Core
内部禁止通过 `@xiehe/imaging-core` 自引用。

## 验证

```bash
npm run type-check:core
npm run test:core
```

`tests/platform-boundaries.test.ts` 会检查平台依赖、浏览器全局变量、Web 别名和
DDD 层级依赖。
