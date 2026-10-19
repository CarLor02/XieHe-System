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
npm run start --workspace @xiehe/mobile-expo
```

1. 手机安装与 **SDK 57** 匹配的 [Expo Go](https://expo.dev/go?device=true&platform=android&sdkVersion=57)。
   若商店版本支持其他 SDK，可在该官方页面选择 SDK 57 安装包。
2. 手机和电脑连接同一个局域网，在 Expo Go 中扫描终端二维码。
3. 也可以手动输入终端显示的 `exp://<电脑局域网 IP>:8081`。
4. 用 Web 端已有的账号密码登录。编辑 `src/` 后会通过 Fast Refresh 更新手机页面。
   Expo Go 首次显示开发菜单介绍时，关闭或继续即可进入登录页。

业务请求直接访问统一 HTTPS API，无需在本机启动 Python 后端或转发 8000 端口。
Expo 的 8081 端口只负责本地 bundle 和调试连接。二维码中的 IP 随电脑网络变化，
不要把手机自身的 `localhost` 当成电脑地址。

### USB 调试

局域网无法互访时，可打开安卓开发者选项和 USB 调试，连接电脑并在手机确认授权：

```bash
adb devices
adb reverse tcp:8081 tcp:8081
npm run start:usb --workspace @xiehe/mobile-expo
```

在 Expo Go 打开 `exp://127.0.0.1:8081`。多个设备同时在线时，`adb reverse` 使用
`adb -s <设备序列号> reverse tcp:8081 tcp:8081` 指定手机。若 8081 已被占用，先停止
之前的 Expo 进程；改用其他端口时同步修改 `adb reverse` 的两个端口。

### 服务器与会话

默认地址已配置，无需 `.env`。需要临时切换时，可在登录页展开「连接设置」，填写后端
根地址（不包含 `/api/v1`），或在 `mobile-expo/.env.local` 中设置：

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
| 工作台   | 真实统计、最近五份待处理影像、近期动态、快捷入口、下拉刷新                      |
| 患者     | 搜索、性别筛选、分页、详情、新增、编辑、患者影像分页                            |
| 影像     | 搜索、检查类型/状态筛选、分页、基本信息、缩放、拖动、水平翻转、重置             |
| 测量     | 使用共享标注文档协议读取已保存测量与报告；调用真实 AI 测量接口查看结果          |
| 上传     | 系统文件/相册/拍照、检查类型、可选患者/团队归属、分片上传、实际进度、服务端确认 |
| 报告     | 报告列表与摘要、基于测量调用报告生成接口、预览及系统文字分享                    |
| 个人中心 | 个人资料查看/保存、团队列表、修改密码、连接及版本信息                           |

- PNG/JPEG 使用原图预览；DICOM/TIFF 使用服务端缩略预览，不宣称支持原始 DICOM
  解码、窗宽窗位调整或诊断级阅片。
- 手动关键点/标注编辑、医学参数校准、报告审核与 PDF 导出仍使用 Web 端。
- AI 和报告生成结果当前只在页面内预览，**不会自动写入标注或保存报告**。界面有对应提示。
- 上传支持 PNG/JPEG/TIFF/DICOM，首版单文件最大 100 MB。相册和拍照产生的是普通图片。
  上传时保持应用在前台；成功只在 API 完成确认并返回影像 ID 后显示。
- 消息接口尚无共享 SDK 契约，原型中的消息中心没有接入首版。
- 预签名的对象存储地址也必须能被手机访问，且不会携带业务 API 的 Authorization。

## iOS 与原生开发构建

跨平台代码已包含 iOS。iOS 原生构建需在安装 Xcode 的 macOS 环境执行：

```bash
npm run build:ios --workspace @xiehe/mobile-expo
```

Android 原生开发构建需配置 Android Studio、Java 和对应 SDK，并连接调试设备：

```bash
npm run build:android --workspace @xiehe/mobile-expo
# 安装开发构建后，后续日常启动
npm run start:dev-client --workspace @xiehe/mobile-expo
```

这些命令由 Expo 生成本地 `android/` / `ios/`（已忽略）。日常 Expo Go 调试不需要先构建
APK，也不需要 EAS 云构建。新增原生依赖或修改原生配置后，需要重建 development client。

## 目录与维护

```text
src/app/                  # 轻量路由入口、保护路由和原生 Tab/Stack 导航
src/application/          # 会话组合、依赖注入和移动端服务端口
src/features/auth/        # 登录表单、认证用例与服务器地址约束
src/features/dashboard/   # 工作台
src/features/patients/    # 患者表单规则、查询和 UI
src/features/imaging/     # 影像查看、上传用例、AI/报告预览
src/features/reports/     # 报告列表和摘要
src/features/profile/     # 个人资料、团队与密码
src/infrastructure/       # HTTP SDK、SecureStore、原生文件读取及 Web adapter
src/shared/               # 无业务归属的 UI、主题和加载/防抖适配
ui-prototype/             # 独立 Vite HTML 原型，不参与 Expo 编译和打包
```

HTTP DTO 和 endpoint 继续归属于共享 contracts / SDK；患者查询展示、登录校验、标注
解码及分片上传协调复用已有公共包。页面不得自行创建 Axios 实例或引入 HTML 原型代码。

## 检查与验证边界

在仓库根目录运行：

```bash
npm run type-check --workspace @xiehe/mobile-expo
npm run lint --workspace @xiehe/mobile-expo
npm run test --workspace @xiehe/mobile-expo
npm run export --workspace @xiehe/mobile-expo
```

`test` 中的 HTTP 集成测试只在 loopback 随机端口启动隔离服务，验证共享 HTTP / SDK
组合后的登录、退出、准确分片、无鉴权存储请求、ETag 与服务端完成确认；不访问生产。
其他测试覆盖会话归属与退出竞争、日期校验和 AI `value` 字段兼容。

2026-10-19 首版完成类型检查、lint、21 项移动端测试、Android/iOS/Web bundle 导出，
并在 Android 模拟器 + Expo Go SDK 57 中实际启动登录页。浏览器使用本地隔离 API
验证登录、工作台、患者新增/详情、患者归属上传、影像查看、Tab 导航及退出。
统一服务器只做了未鉴权 `/api/v1/auth/me` 的连通性检查（返回预期 401）；
**真实账号的数据读写、真实手机上传和 iOS 原生运行需要用实际设备及账号继续验收**。

Web 预览可以运行 `npm run web --workspace @xiehe/mobile-expo`；生产 API 的 CORS
是否允许本地浏览器应独立验证，不通过放宽生产 CORS 来替代安卓/ iOS 真机联调。
