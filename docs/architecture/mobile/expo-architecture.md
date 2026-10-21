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

## 已落实的职责边界与后续约束

API 整理后，两端使用同一份生成 DTO 与 Stellarmesh SDK。生成入口、存储例外及会话
规则见 [共享 API 说明](../frontend/shared-api-client.md)。移动端同时完成以下收敛：

- `features/auth/application/ports.ts` 定义认证网关和令牌存储，登录/退出用例只依赖这些
  端口，不再接收 `ExpoApiInfrastructure`。退出先结束本机会话，再通知服务端。
- 上传用例只接收 `ImageUploadGateway` 和需要的字节传输方法，不再接收整个 SDK；
  文件读取、分片边界校验、ETag 和服务端完成确认仍由原有流程保护。
- 患者查询、筛选、分页状态在 `patients/application/usePatientList.ts`；个人统计与退出
  状态在 `profile/application/useProfile.ts`。组件保留导航、弹层和呈现。
- 服务装配移入 `application/createMobileServices.ts`，HTTP 基础设施只创建传输、会话
  和 SDK。`MobileServices` 本轮没有增加业务入口；新增能力应按模块提供所需端口，
  不继续扩大全局容器或把整份 SDK 下发给复杂用例。

其他列表/文件选择和系统链接仍随实际工作流继续收敛。React hook 可负责加载状态、
生命周期和错误显示；平台文件、链接与安全存储实现放在基础设施中。共享测量、标注和
权限规则继续属于已有 core 包。本轮不批量更换目录名称，也不预建空的分层目录。

## UI 与真实能力

四个 Tab 参考 `mobile-expo/ui-prototype/` 的页面顺序和布局，运行时仍只用真实 API：
个人中心三列显示患者总数、已处理影像、完成率；不把全局统计伪装成本月个人审核。
消息入口复用近期业务动态，不宣称拥有独立通知、未读计数或推送；账号信息入口不生成
模拟工牌二维码。影像原始文件交给系统浏览器打开，下载结果由系统处理，不宣称已经离线
保存在应用中。删除需确认并等待服务端成功后刷新；手机端不承诺提供回收站或恢复功能。

## 原生影像标注初版（2026-10-21）

编辑已形成独立的加载、草稿、历史与保存生命周期，因此新增平级模块
`features/image-editor/`，不嵌套在 `imaging/features/` 下。影像详情通过轻量路由
`images/annotate` 进入编辑页；返回详情时由原有焦点加载读取最新数据。

- `application/ImageEditorSession.ts` 是不依赖 React/Expo 的编辑会话，负责服务器读取、
  草稿、完整动作的撤销/重做、保存锁与乐观版本冲突；`useImageEditor` 仅适配订阅和卸载。
- `application/drawingSession.ts` 接入 core 的落点、继承点、AVT、骨盆及 Cobb 放置规则。
  应用辅助函数适配关键点/手动绑定传播及计算端口，不重写医学公式或工具目录，
  因此没有另建移动端领域规则层。
- `components/` 负责原生 SVG、触控命中、手势和面板。布局参考 HTML 原型，视觉采用 Web
  阅片器的深灰面板、蓝色选中态、工具色和既有医学矢量图标。缩小屏幕时快捷工具可滚动。
- 模块只接收 `ImageEditorGateway`（影像读取、预览、版本化保存），基础设施适配共享 SDK；
  `MobileServices` 只装配这个模块端口，不逐个暴露编辑器操作或向用例传入整份 SDK。

已有标注通过 `prepareStudyEditorState` 原子水合，保存通过 `runAnnotationSave` 生成
同一文档协议，并调用现有 `saveAnnotation(fileId, expectedVersion, annotation)`。
单点修改同步关键点及已有手动绑定，重算相关测量，保留无关项的历史数值。保存同时保留
标尺、检测层、股骨头和报告；失败保留草稿，409 停止继续写入，显式重新读取后才能编辑。
未完成的绘图不允许保存；离开有草稿的页面需确认，完成按钮只有在保存成功后才返回。

坐标属于原始标注文档，缩放和平移不进入保存快照。PNG/JPEG 在没有文档尺寸时使用
实际加载的原图尺寸。DICOM/TIFF 使用现有服务端预览图，沿用文档记录的原图尺寸；若旧
标注缺少原图尺寸则只允许查看，提示先经 Web 打开并保存，再重新读取。此时不把缩略图
尺寸伪装成原图尺寸。当前不提供原始 DICOM/TIFF 解码、窗宽窗位、自动保存或进程被系统
终止后的草稿恢复。已有手动绑定参与读取、传播与保存；本轮不新增绑定创建面板。

测试覆盖真实 SDK 声明的 POST 请求、GET 预签名入口、版本保存/回读，以及编辑会话中的
点位同步、绑定传播、AVT 点序、双 FH、标尺、撤销/重做、失败/冲突和晚到响应。浏览器
交互检查使用合成影像及临时测试网关；正式应用只使用已登录会话的真实 API，无演示路由。
