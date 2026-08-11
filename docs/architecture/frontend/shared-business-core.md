# Web 与 Expo 共享业务规则包

## 目标

除影像标注和 HTTP SDK 外，认证、权限、患者、上传和仪表盘中可脱离 UI 与平台运行的
规则也由 npm workspace 共享。Web 和 Expo 只组合这些规则，不再分别维护同一套校验、
筛选和状态推导。

```text
packages/
├── xiehe-auth-core/       # 登录/注册校验、JWT 会话元数据
├── xiehe-access-core/     # 系统管理员与团队管理员权限判断
├── xiehe-patient-core/    # 身份证、患者查询、患者展示映射
├── xiehe-upload-core/     # 影像归属偏好协议、上传队列状态
└── xiehe-dashboard-core/  # 待处理任务日期筛选与分页
```

这些包只导出稳定的公开入口。平台不得深层导入包内 `domain/`，包内也不得依赖 Web 或
Expo。

## 分层边界

公共包中的 `domain/` 负责纯规则和可序列化结构。后续出现需要跨多个规则编排、但仍不
依赖网络或 UI 的流程时，放入对应包的 `application/`；端口由 application 声明，平台
在 composition root 注入实现。

平台层继续负责：

- Web 的 `localStorage`、Zustand、React 表单和 Next 路由；
- Expo 的 SecureStore、手势、原生导航和生命周期；
- API 请求、错误提示、日志、时钟及随机数的获取；
- 文件、Blob、Canvas、下载和系统权限。

例如影像归属偏好的 key、规范化和 JSON 解码位于 `upload-core`，而读写
`window.localStorage` 的 adapter 仍位于 Web。仪表盘规则接收调用方传入的 `now`，不在
公共包内读取系统时钟，因此测试和不同时区平台的行为可控。

## 已迁移调用链

| 业务链路  | 公共规则                         | Web 保留职责                       |
| --------- | -------------------------------- | ---------------------------------- |
| 登录/注册 | 字段校验、JWT 过期时间、会话结构 | 提交、持久化、刷新、跳转           |
| 团队权限  | 团队设置与上传者视角权限         | 团队 API、按钮与弹窗               |
| 患者      | 身份证校验、查询参数、搜索项展示 | 患者 API、表单状态、分页组件       |
| 上传      | 归属偏好协议、队列汇总           | 文件处理、裁剪、上传、localStorage |
| 仪表盘    | 今日任务、优先级汇总、分页       | 数据加载和任务卡片                 |

旧 Web 本地纯规则已删除；不得以兼容 re-export 的形式恢复。协议 DTO 继续归属于
`@xiehe/api-contracts`，endpoint 归属于 `@xiehe/api-sdk`，医学影像规则归属于
`@xiehe/imaging-core`，避免新包职责重叠。

## 验证

```bash
npm run verify:shared
npm run type-check:web
npm run test:web
npm run build:web
npm run type-check:mobile
npm run export:mobile
```

`verify:shared` 会运行五个包的类型检查、单元测试和平台边界扫描。边界扫描拒绝 React、
React Native、Next、Expo、Web `@/` 别名以及 `window`、`document`、浏览器存储等平台
依赖。
