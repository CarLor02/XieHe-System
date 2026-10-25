# 协和脊柱影像 · React Native / Expo

Android 与 iOS 共用一套 React Native 代码，使用 Expo SDK 57、Expo Router 和仓库的
`@xiehe/api-sdk` / 共享业务包。默认后端为 **https://xiehe.stellarmesh.cn**，
与 Web 端使用同一账号及业务数据。应用没有演示入口或运行时模拟数据。

## 安卓真机调试

需要 Node.js >= 22.13、npm >= 10.9。所有 workspace 的依赖在**仓库根目录**安装：

```bash
# 首次安装，或锁文件更新后运行；已有当前依赖时可跳过
npm ci

# 必须从仓库根目录执行
npm run start --workspace @xiehe/mobile
```

1. 手机安装与 **SDK 57** 匹配的 [Expo Go](https://expo.dev/go?device=true&platform=android&sdkVersion=57)。
   若商店版本支持其他 SDK，可在该官方页面选择 SDK 57 安装包。
2. 手机和电脑连接同一个局域网，在 Expo Go 中扫描终端二维码。
3. 也可以手动输入终端显示的 `exp://<电脑局域网 IP>:8081`。
4. 用 Web 端已有的账号密码登录。编辑 `src/` 后会通过 Fast Refresh 更新手机页面。
   Expo Go 首次显示开发菜单介绍时，关闭或继续即可进入登录页。

业务请求直接访问统一 HTTPS API。当前分支已迁移普通业务 POST 路由，服务器必须部署
配套后端后才能完整调试；旧服务不具备这些新路由。若本机后端运行在 8000 端口，可通过
`adb reverse tcp:8000 tcp:8000`，把登录页服务器地址设为 `http://127.0.0.1:8000`。
Expo 的 8081 端口只负责本地 bundle 和调试连接。二维码中的 IP 随电脑网络变化，
不要把手机自身的 `localhost` 当成电脑地址。

### USB 调试

局域网无法互访时，可打开安卓开发者选项和 USB 调试，连接电脑并在手机确认授权：

```bash
adb devices
adb reverse tcp:8081 tcp:8081
npm run start:usb --workspace @xiehe/mobile
```

在 Expo Go 打开 `exp://127.0.0.1:8081`。多个设备同时在线时，`adb reverse` 使用
`adb -s <设备序列号> reverse tcp:8081 tcp:8081` 指定手机。若 8081 已运行本项目的 Expo
服务，可直接复用，无需重复启动；若被其他服务占用，选择空闲端口，并同步修改
`adb reverse` 的两个端口。

### 服务器与会话

默认地址已配置，无需 `.env`。需要临时切换时，可在登录页展开「连接设置」，填写后端
根地址（不包含 `/api/v1`），或在 `mobile/.env.local` 中设置：

```dotenv
EXPO_PUBLIC_API_URL=https://xiehe.stellarmesh.cn
```

修改环境变量后重启 Metro。`EXPO_PUBLIC_*` 会打入客户端，只能存公开配置。
Android/iOS 的访问令牌与刷新令牌由 SecureStore 保存，并绑定服务器地址；退出会清除
本机会话。浏览器预览的令牌只在内存中保留，刷新页面需要重新登录。

## 首版范围

| 模块     | 当前行为                                                                        |
| -------- | ------------------------------------------------------------------------------- |
| 登录     | 真实账号登录、恢复会话、共享 SDK 自动刷新令牌、失效返回登录、退出               |
| 工作台   | 原型的双统计卡、四个快捷入口、紧凑任务列表、近期动态、下拉刷新                  |
| 患者     | 搜索、筛选、分页、详情、新增、编辑、删除、患者影像及诊断报告入口 |
| 影像     | 缩略图、搜索/筛选/分页、原始文件、删除、重命名、检查类型/团队修改、标注保存历史 |
| 测量     | 已有点位、工具绘图、拖动修改、标尺、手动点位绑定、撤销/重做、AI 测量及版本保存 |
| 上传     | 文件/相册/拍照、患者/检查类型/团队、分片上传、进度与服务端确认 |
| 报告     | 列表/筛选/分页、完整详情、新建/编辑/删除、测量报告生成与保存、系统文字分享 |
| 个人中心 | 统计、资料保存、头像上传/移除、修改密码、团队与成员/申请/邀请管理 |

- 上传与编辑范围为 PNG、JPEG、TIFF；文件选择器和上传校验一致，未支持的历史文件不会进入预览/编辑流程。原型中的文件示例与提示也已调整。
- 影像详情 →「绘图与标注」或「AI 测量与报告」。AI 返回结果经共享 core 处理后进入编辑草稿，可拖动、撤销和重新绘图；点击保存才更新服务器。
- 报告生成使用当前草稿的测量数值，报告文字随同影像标注保存。诊断报告列表是后端独立的报告记录，支持真实 CRUD；影像 ID 不会被误当成报告的 study_id。
- 保存携带 annotation_version。失败保留草稿，409 阻止继续覆盖；重新读取前确认放弃修改。手动点位绑定创建/解除进入同一撤销历史。
- PNG/JPEG 显示原图；TIFF 使用服务端预览，标注坐标来自原始文档。旧 TIFF 缺少尺寸时可运行 AI，使用模型返回的原图尺寸建立坐标系；未取得尺寸前只能查看，不能用缩略图尺寸保存。
- 原型和 Web 中的报告审核、模板、PDF/Word 导出及独立通知尚缺完整可用后端契约，本端不展示模拟成功操作。消息入口仍是近期业务动态。
- 团队的创建、编辑、搜索/申请/撤销、成员列表/角色/移除、加入申请审核、邀请及接受/拒绝接入真实 API。管理权限复用 access-core，最终由后端校验。
- 单张影像最大 100 MB，头像支持 PNG/JPEG/WebP、最大 5 MB。对象存储仍使用原有预签名 PUT 与完成接口，必须取得 ETag，不携带 API Authorization。
- 同步数据、批量操作不在本轮范围。影像原始文件由系统浏览器处理；未新增离线缓存、推送通知或自动保存。

接口范围、验证边界及后端缺口见 [移动端 API 功能清单](../docs/architecture/mobile/api-coverage.md)。

## iOS 与原生开发构建

跨平台代码已包含 iOS。iOS 原生构建需在安装 Xcode 的 macOS 环境执行：

```bash
npm run build:ios --workspace @xiehe/mobile
```

Android 原生开发构建需配置 Android Studio、Java 和对应 SDK，并连接调试设备：

```bash
npm run build:android --workspace @xiehe/mobile
# 安装开发构建后，后续日常启动
npm run start:dev-client --workspace @xiehe/mobile
```

这些命令由 Expo 生成本地 `android/` / `ios/`（已忽略）。日常 Expo Go 调试不需要先构建
APK，也不需要 EAS 云构建。新增原生依赖或修改原生配置后，需要重建 development client。

### 本地 release APK

性能对比使用内置 JS bundle 的 release 包，不依赖 Metro。已生成 `android/` 时，从仓库根目录执行：

```bash
cd mobile/android
ANDROID_HOME="$HOME/Android/Sdk" ./gradlew :app:assembleRelease
cd ../..
adb -d install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

安装后从手机桌面打开「协和脊柱影像」。`install -r` 覆盖安装并保留数据；本地包沿用 Expo
生成的调试签名，仅用于本机验证。首次生成原生目录并构建、安装也可以继续使用
`npm run build:android --workspace @xiehe/mobile -- --variant release --no-bundler`。

若 Gradle 下载依赖需要本机 Clash HTTP 代理，可在用户级 `~/.gradle/gradle.properties`
设置 `systemProp.http.proxyHost` / `systemProp.https.proxyHost` 为 `127.0.0.1`，对应的
`proxyPort` 为本机端口；代理配置不要写入仓库。

### Android CI

仓库的 `.github/workflows/android-ci.yml` 使用 Node.js 22、JDK 21 和 Android SDK，
从根锁文件安装 `@xiehe/mobile` 及其依赖，执行类型检查、lint、测试和三端 JS 导出，
再通过 Expo prebuild 生成 Android 工程并构建 release APK。
移动端、共享包、workspace 清单、锁文件或工作流变更时会在 main/dev 的推送和 PR 中运行，
也支持版本标签和手动触发。APK 上传到该次 Actions 运行的 `mobile-android-release-apk`
制品，保留 14 天，供安装验证；正式签名与 GitHub Release 自动发布后续单独配置。

## 目录与维护

```text
src/app/                  # 轻量路由入口、保护路由和原生 Tab/Stack 导航
src/application/          # 会话组合、依赖注入和移动端服务端口
src/features/auth/        # 登录表单、认证用例与服务器地址约束
src/features/dashboard/   # 工作台
src/features/patients/    # 患者表单规则、查询和 UI
src/features/imaging/     # 影像查看、上传用例、AI/报告预览
src/features/image-editor/ # 独立标注会话、原生 SVG/手势、绘图与版本化保存
src/features/reports/     # 报告列表和摘要
src/features/profile/     # 个人资料、团队与密码
src/infrastructure/       # HTTP SDK、SecureStore、原生文件读取及 Web adapter
src/shared/               # 无业务归属的 UI、主题和加载/防抖适配
ui-prototype/             # 独立 Vite HTML 原型，不参与 Expo 编译和打包
```

源代码跨目录引用统一使用 `@/` 别名，对应 `src/`，例如
`import { ChoiceSheet } from '@/shared/ui/choice-sheet'`；目录内部引用和公开入口导出
保留 `./` 相对路径。`@/assets/` 对应应用根目录的 `assets/`，共享业务包继续使用
`@xiehe/*` 包入口。Expo/Metro 使用已有的 `tsconfig.json` 路径映射，Vitest 同步配置
别名解析，lint 会阻止重新引入跨目录的 `../` 路径。

公共 UI 按组件建立小写连字符目录，例如 `src/shared/ui/choice-sheet/`，目录内放
`ChoiceSheet.tsx` 实现和 `index.ts` 公开导出；组件自己的样式与实现放在一起。
根目录 `src/shared/ui/index.ts` 也只维护公开导出，不承载组件实现或样式。
调用方通过 `@/shared/ui` 或 `@/shared/ui/choice-sheet` 的目录入口导入，不依赖内部实现文件；
公共组件之间通过 `@/shared/ui/icon` 等组件目录入口依赖，避免反向导入根入口形成循环依赖。
患者、影像等业务查询和状态编排继续留在所属 feature，公共 UI 不直接依赖业务服务。

单选选项统一使用 `SelectionList`，通过 `@/shared/ui/selection-list` 目录入口导入；
完整的底部单选弹层使用 `SelectionSheet`，通过 `@/shared/ui/selection-sheet` 导入。
两者接收 `options`、`value` 和 `onChange`，由调用方持有选中值。
弹层在选择后通知调用方并关闭；检查类型、处理状态、
性别和报告状态的选项定义、查询与分页重置继续留在所属业务模块。表单复用单选列表，
保留内嵌布局；整个列表或单个选项可禁用，“全部”选项可使用空字符串或 `undefined`。

`ChoiceSheet` 使用已有 `@expo/ui/community/bottom-sheet`：Android/iOS 使用原生弹层，
Web 使用其 Vaul 实现。公共入口仍是 `title / open / onClose / children`，新增可选
`dismissible`（默认 `true`）。保存或删除期间应传入 `dismissible={!busy}`，同时锁定
拖动、遮罩、返回和关闭按钮，不能只依赖 `onClose` 内的忙碌判断。
弹层保留受限高度的滚动内容区；业务查询、分页和选项状态不进入公共组件。
Web 标题与读屏说明使用同一个 Vaul 上下文，因此将 Expo UI 已依赖的 `vaul` 显式声明为
直接依赖；没有引入新的组件框架或升级现有依赖版本。

日期字段通过 `@/shared/ui` 或 `@/shared/ui/date-field` 使用 `DateField`。
它接收 `label / value / onChange`，值为 `YYYY-MM-DD`，清空回调为空字符串；
可选 `minimumDate / maximumDate / disabled / clearable / error`。
Android 使用原生日期对话框，iOS 使用滚轮与显式确认，取消不会提交草稿；
Web 单独使用原生 `input[type=date]`，避免 Expo 日期组件在 Web 返回空内容。
平台适配按本地日历日期转换，不通过 UTC 时间戳截取日期。患者出生日期上限由患者表单
传入今天，后端请求中的 `null`、日期合法性和未来日期校验仍由原有表单规则负责。

公共组件的颜色、间距、圆角、字号、控件尺寸和按压/禁用透明度统一来自
`src/shared/theme.ts`；`Field` 与 `DateField` 共用字段样式。业务专属布局和影像画布
样式仍留在所属模块。

四个 Tab 共用 `Header` 的紫色背景和默认 64dp 标题行，顶部安全区单独计算，
不在 Header 内嵌搜索、筛选或问候内容，也不使用底部圆角。标题行使用最小高度，
大字体和长标题可以自然增高；二级页面仍可显示副标题和返回按钮。
患者中心与影像中心通过公共 `ListToolbar` 在 Header 下方放置搜索和筛选，
与 `Content` 滚动区同级，保持工具区固定。列表数量提示在内容区顶部，
工作台问候与日期也随内容滚动；查询、分页和筛选状态仍由业务模块管理。

`Button` 与 `IconButton` 的调用方式保持不变，内部通过 `button-surface/` 适配
Expo UI：Android 使用 Compose 按钮，iOS 使用 SwiftUI 按钮，Web 使用通用按钮。
平台适配负责 Host 布局、主题颜色、圆角和可访问名称；普通按钮随容器宽度布局，
紧凑按钮在原生端按内容测量，图标按钮保持固定尺寸。原生按钮的标签、图标和进度
全部使用 Compose/SwiftUI 组件，不在可点击控件内部嵌套 `RNHostView`，避免两套
布局的尺寸测量和触控命中不一致。图标复用现有 Ionicons 的字形表及字体，通过
`expo-font` 加载；Compose 使用注册别名，SwiftUI 使用字体文件的 PostScript 名。
Android 图标按钮显式使用 `Shape.Circle({ radius: 1 })`；当前 Expo UI 原生实现的
圆形默认半径为 0，省略后会将图标和背景裁掉，但仍留下可点击区域。
Web 继续使用 RN 文字、图标和进度组件，业务调用方不需要区分平台。
`loading` 与 `disabled` 都会禁用原生按钮及点击回调，加载时保留文字并替换图标为
进度指示器。`button-surface` 供公共组件内部使用，业务页面继续从 `@/shared/ui`
导入 `Button`、`IconButton`，不依赖平台 modifiers 或 Host。

`FilterChip` 通过 `button-surface/` 适配 Compose 可点击 Surface / SwiftUI 按钮，
保留公共主题中的颜色、文字、间距、圆角与轻阴影。背景、边框和点击反馈由同一个
原生轮廓负责，不在外层 RN 容器中再画一个胶囊。内容最小高度为 48dp，避免 Compose
为触控目标额外补留白后出现内外两层胶囊。各端统一最小宽度 136dp、水平内边距 16dp，
图标和文字居中；常见短选项保持相同宽度，长文字及大字体仍允许自然撑开。
`active` 由业务调用方控制，点击只触发 `onPress` 打开现有选择器，不在组件内切换
筛选值。Android 通过
按钮描述朗读筛选状态，iOS 使用选中辅助功能特征；Web 保留可声明选中状态的
RN 按钮适配。大字体可自然增高，不强行裁切按钮。
搜索框仍使用现有 `SearchField`，查询与分页流程不随按钮迁移。

HTTP DTO 和 endpoint 继续归属于共享 contracts / SDK；患者查询展示、登录校验、标注
解码及分片上传协调复用已有公共包。页面不得自行创建 Axios 实例或引入 HTML 原型代码。

后续采用共享核心包与单层业务模块的 DDD 组织，保持 `features/` 只有一层，按实际职责
提取应用编排和平台端口。认证、上传已使用窄端口，患者和个人中心的查询状态已提取，
详见[移动端架构评估与建议](../docs/architecture/mobile/expo-architecture.md)。

### 编辑交互的性能边界

- `components/interaction/` 管理原生手势、命中适配与跨线程传递。Reanimated 驱动影像
  transform、SVG 视口和当前控制点的即时预览；手势闭包不捕获普通 JS 编辑会话。
- UI 线程每显示帧至多提交一个最新坐标，业务计算至多一个在途。忙时覆盖待处理坐标，
  松手独立刷新最终位置；取消、双指接管或卸载后，旧手势的事件不能继续编辑。
- `ImageEditorSession` 继续持有标注事实、关联规则、撤销和保存。画布订阅高频预览，
  页面操作栏/导航只订阅事务边界；关闭的面板不构造内容。一次拖动仍只产生一条历史，
  拖动不调用保存 API。
- core 按明确的关键点依赖更新相关测量，手动绑定只复制变化的几何。UI 控制点的水平/
  垂直约束也由 core 提供；复杂医学联动和测量值留在 JS 应用层，按帧更新。
- 依据不可变拖动基线与实际结果，将受影响的几何和静态标注放入独立 SVG 根节点。
  未变标注复用绘制结果，动态 SVG 仅覆盖可见几何范围，边界按小网格扩展，避免每个
  像素都触发布局变化。当前控制点使用原生小视图，由 UI 线程更新 transform，不使
  SVG 位图随控制点预览失效；最终坐标提交后再撤去预览。
- 标签有独立绘制层，与测量列表一起订阅 `EditorReadoutStore`：拖动中最多每 100 ms
  发布一次读数，松手、取消和状态切换立即刷新。这个节流不影响几何计算、撤销或保存。

工具面板底部提供「画布性能统计」，默认关闭。打开「采集拖动性能」后返回画布，连续
拖动一个点位数秒，松手后再进入面板查看最近一次记录。统计包括 UI 回调间隔、JS
编辑处理耗时与 React 几何提交间隔的均值、P95 和最大值；仅保存在编辑页内存中，
退出页面清除，不记录影像、坐标或患者信息。关闭开关即可停止采样。
**UI 回调频率与 React 提交次数不等于屏幕实际呈现 FPS**，这些数据仅用于定位瓶颈。

性能验收请用同一张正位/侧位影像，对比连续拖点、显示关键点、联动 PI/PT/TPA、双指
缩放和平移，并检查撤销后再保存/重开。浏览器和桌面计算基准不能替代真机帧率与跟手体验。

2026-10-22 第一轮优化通过移动端类型检查、lint 和 75 项测试，共享 imaging-core 类型检查
和 255 项测试；Web 类型检查及 419 项测试通过，lint 无错误、保留 63 项既有警告。
Web 会话集成测试的回环端口在沙箱中被禁止，已在主机单独重跑通过。
Android release APK 与 Android/iOS/Web production bundle 构建通过。浏览器使用本地
合成影像验证了拖点、水平线绘图/约束、缩放平移、单次撤销、保存和重新读取；没有操作
生产数据。实际 Android 的帧率、持续跟手体验和 iOS 原生交互仍需设备验收。

同日第二轮针对绘制分层、原生控制点、读数节流和按需统计的优化，通过移动端类型检查、
lint 和 87 项测试；新增回归覆盖手动绑定/关键点联动的分层、动态区域裁剪、缩放后的
控制点投影、读数最终值与取消/卸载清理、统计开关和过期手势。Android release APK
及三端 production bundle 构建通过。浏览器合成数据验证了拖点、水平约束、静态测量
保持、缩放对齐、撤销/重做、保存重开和统计面板；它不作为 Android 帧率提升的证据。
本轮仅修改移动端，未改动共享领域规则、Web 或后端。

## 检查与验证边界

在仓库根目录运行：

```bash
npm run type-check --workspace @xiehe/mobile
npm run lint --workspace @xiehe/mobile
npm run test --workspace @xiehe/mobile
npm run export --workspace @xiehe/mobile
```

`test` 中的 HTTP 集成测试只在 loopback 随机端口启动隔离服务，验证共享 HTTP / SDK
组合后的登录、退出、准确分片、无鉴权存储请求、ETag 与服务端完成确认；不访问生产。
其他测试覆盖会话归属与退出竞争、日期校验和 AI `value` 字段兼容。

2026-10-19 首版完成类型检查、lint、21 项移动端测试、Android/iOS/Web bundle 导出，
并在 Android 模拟器 + Expo Go SDK 57 中实际启动登录页。浏览器使用本地隔离 API
验证登录、工作台、患者新增/详情、患者归属上传、影像查看、Tab 导航及退出。
首版自动验证对统一服务器只做了未鉴权 `/api/v1/auth/me` 的连通性检查（返回预期 401）；
**真实账号的数据读写、真实手机上传和 iOS 原生运行需要用实际设备及账号继续验收**。

同日四个 Tab 的布局调整通过手机尺寸的浏览器视觉检查，并使用本机临时隔离 API 验证
患者筛选/编辑入口、影像筛选/空状态/清除筛选、删除取消与确认、查看器跳转、个人统计
和消息入口。合成数据和临时验证服务不进入仓库或运行时；本轮没有操作线上患者数据。
Android/iOS/Web 导出、移动端 21 项测试、SDK 7 项测试、协议 2 项测试和 Web 类型检查
通过。随后通过 USB 在用户安卓手机中加载了更新后的工作台，确认真实统计、顶部安全区
和底部 Tab 正常显示；没有在真机执行新增或删除数据。其余更新页面的原生交互及 iOS
原生运行仍需继续验收。

Web 预览可以运行 `npm run web --workspace @xiehe/mobile`；生产 API 的 CORS
是否允许本地浏览器应独立验证，不通过放宽生产 CORS 来替代安卓/ iOS 真机联调。


API 契约统一整理后的生成命令、POST 迁移表和存储保留范围见
[apiContract/README.md](../apiContract/README.md)。运行 `npm run api:update` 会从本地
FastAPI 离线导出，不访问生产 OpenAPI、不启用生产文档，也不启动数据库/存储 lifespan。
