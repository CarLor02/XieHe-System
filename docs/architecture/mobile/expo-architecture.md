# Expo 移动端架构评估与建议

2026-10-19。本文基于当前 `mobile-expo/src/` 和 workspace 共享包评估。四个 Tab 的 UI
已先按原型调整；下面是后续架构方向，不表示首版已经完成所有分层迁移。

## 判断

继续使用 DDD，但采用**共享核心包 + 单层业务模块 + 移动端应用编排 + 平台适配**。
不复制 Web 的 `features/image-viewer/features/...` 结构，也不在手机端重建已有领域核心。
DDD 的价值在于规则归属、用例职责和依赖方向，不在于目录名称或每个功能都配齐四层。

当前移动端的 `src/features/` 已经只有一层，可以保留这个名字。为改成 `modules/` 而批量
移动文件收益有限。四个 Tab 是导航入口，也不应当直接等同于四个领域上下文：例如工作台
只组合患者、影像和动态的读模型，不拥有患者或测量规则。

## 现有能力的归属

| 能力                                   | 所属位置                                   | 移动端负责什么                               |
| -------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| HTTP DTO、状态枚举、请求/响应协议      | `@xiehe/api-contracts`                     | 映射成页面需要的显示数据                     |
| Endpoint、HTTP、鉴权刷新协议           | `@xiehe/api-sdk`、`@xiehe/api-client`      | 创建客户端、注入会话与错误处理               |
| 认证校验、团队权限、患者规则           | `auth-core`、`access-core`、`patient-core` | 表单状态、导航、系统权限和安全存储           |
| 影像、测量、关键点、标注文档、工具目录 | `imaging-core`、`imaging-catalog`          | 原生画布、手势、选中状态、编辑工作流         |
| 分片上传协调、上传状态、任务规则       | `upload-core`、`dashboard-core`            | 读取设备文件、字节传输、前后台生命周期和展示 |

公共包保持纯 TypeScript 的平台边界；不要把 React、Expo、SecureStore、Canvas 或
`Linking` 放进去。只通过包公开入口依赖公共能力，不导入 Web 页面或其 feature 内部实现。

## 建议保留的目录形态

```text
src/
├── app/                         # Expo Router：路由参数、登录保护、Tab/Stack 组合
├── application/                 # 应用启动、会话容器、依赖装配
├── features/                    # 业务模块只在这里出现一层
│   ├── auth/
│   ├── dashboard/
│   ├── patients/
│   ├── imaging/
│   │   ├── application/         # 查询/上传/查看流程、React 状态适配、必要的端口
│   │   ├── components/          # Screen、卡片、查看器、工具栏、弹层
│   │   ├── domain/              # 仅确实属于本端的纯规则；共享规则直接用 core
│   │   └── index.ts             # 稳定公开入口
│   ├── reports/
│   └── profile/
├── infrastructure/              # HTTP、SecureStore、文件、系统链接等平台实现
└── shared/                      # 通用 UI、主题、无业务归属的 hooks
```

各模块按需要建层，不创建空的 `domain/`、Repository 或只有一次方法转发的 UseCase。
复杂度增加时可以在 `application/`、`components/` 内按职责分目录，但不再引入一层
`features/`。工具栏、测量面板、AI 弹层首先是所属模块的组件或用例，不各自变成 feature。

若将来原生标注形成独立编辑会话、历史记录与保存生命周期，再考虑将 `analysis/`
作为 `imaging/` 的平级模块。该模块依赖共享影像核心及明确端口；不在其内部继续套
measurement、keypoint、AI 等 feature。这项拆分应由实际工作流触发，不在本轮预建。

Expo Router 的 `src/app` 只容纳路由，普通组件和 hooks 放在外部；`(main)`、`(tabs)`
是导航分组，可以继续保留。它们与业务模块嵌套是两回事。
参见 [Expo Router 核心概念](https://docs.expo.dev/router/basics/core-concepts/)和
[路由命名约定](https://docs.expo.dev/router/basics/notation/)。

## 依赖与应用流程

- 路由入口依赖模块公开出口；模块组件依赖本模块应用状态和通用 UI。
- 应用编排复用共享核心和 SDK。简单列表查询可直接在查询 hook 使用 SDK，不机械地
  给每个 endpoint 套一层 Repository；认证、上传、保存标注等跨副作用流程使用明确端口。
- 复杂用例只依赖所需端口，例如会话 API + 令牌存储、文件分片读取 + 上传传输；不要让
  用例接收整个 Expo 基础设施容器或整个 SDK。
- 平台实现由应用启动位置注入。业务规则不知道设备文件 URI、SecureStore 或系统浏览器。
  React hook 负责订阅、焦点、加载状态和错误到 UI 的映射；可共享的纯流程仍留在 core。
- 跨模块通过 `index.ts` 或有意设计的公开子入口协作。例如患者选择器现有的
  `patients/selection.ts` 可以保留；不能深层导入其他模块的组件、状态或领域内部文件。
- 患者选择、影像查看、测量计算有业务归属，不因为被两个页面使用就搬到 `shared/`。

## 当前应承认的边界和下一步

当前代码已经具备轻量路由、共享协议/规则和独立平台实现，尚不是完整的依赖倒置结构：

1. `PatientsScreen` 等页面仍同时管理查询、分页和渲染；`ProfileScreen` 还直接编排退出。
   后续按页面工作流提取同级 `application/` hook，组件主要接收显示数据与操作回调。
2. `features/auth/usecases/session.ts` 接收具体 `ExpoApiInfrastructure`，
   `imaging/usecases/uploadImage.ts` 接收整个 SDK 和 HTTP client。
   优先收窄这两个有实际副作用的用例端口，保留现有会话归属和上传确认契约测试。
3. `application/services.ts` 的 `MobileServices` 适合当前首版，但不应继续无限扩展。
   `createLiveServices` 也兼任依赖装配；后续把装配放回应用启动层，按业务流程提供服务，
   HTTP 基础设施只负责建立传输能力。
4. 系统链接目前在影像操作 hook 中调用，文件选择也在上传 hook 中调用。引入上述端口时
   一并收拢到平台适配；`domain/presentation.ts` 中的日期和状态文案应归到展示映射，
   不把它们视为业务领域规则。

本轮只为 UI 调整提取了工作台加载、影像操作、批量缩略图加载和展示组件，没有进行
大规模目录迁移。后续先落实这些职责边界，再随着标注工作流增长决定是否拆平级模块。

## UI 与真实能力

四个 Tab 参考 `mobile-expo/ui-prototype/` 的页面顺序和布局，运行时仍只用真实 API：
个人中心三列显示患者总数、已处理影像、完成率；不把全局统计伪装成本月个人审核。
消息入口复用近期业务动态，不宣称拥有独立通知、未读计数或推送；账号信息入口不生成
模拟工牌二维码。影像原始文件交给系统浏览器打开，下载结果由系统处理，不宣称已经离线
保存在应用中。删除需确认并等待服务端成功后刷新；手机端不承诺提供回收站或恢复功能。
