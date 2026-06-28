# 🏥 医疗影像诊断系统 - 前端应用

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4.1.14-38B2AC.svg)](https://tailwindcss.com)

## 📋 概述

基于 Next.js 的医疗影像诊断系统前端，面向脊柱 X 光片的 AI 辅助分析、影像标注、测量与报告生成。前端只与后端通信，所有 AI 推理均由后端代理调用 AI 微服务完成。

### ✨ 特性

- 🚀 **现代架构**: Next.js 15 App Router + React 19 + TypeScript
- 🎨 **UI 组件**: Tailwind CSS v4 + Radix UI + Headless UI + Framer Motion
- 🔒 **认证**: JWT（access + refresh token）多角色权限管理
- 🦴 **DICOM 支持**: Cornerstone.js + dcmjs + dicom-parser 本地影像解码
- 🖊️ **影像标注**: Fabric.js + Konva + react-konva 绘图层
- 🤖 **AI 分析**: 通过后端代理调用正位/侧位脊柱 AI 模型
- 🌐 **国际化**: i18n 多语言支持
- 🧪 **测试**: Jest + Testing Library

## 📁 目录结构

```
frontend/
├── next.config.js               # Next.js 配置
├── tailwind.config.js           # Tailwind CSS 配置
├── tsconfig.json                # TypeScript 配置
├── jest.config.mjs              # Jest 测试配置
├── eslint.config.mjs            # ESLint 配置
├── Dockerfile                   # 生产容器构建
├── nginx.conf                   # 生产 Nginx 配置
├── app/                         # Next.js App Router（路由入口）
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 根页面（重定向）
│   ├── providers.tsx           # 全局 Provider（React Query、Redux 等）
│   ├── globals.css             # 全局样式
│   ├── auth/                   # 登录 / 注册页面
│   ├── dashboard/              # 仪表板
│   ├── patients/               # 患者管理
│   ├── imaging/                # 影像查看与 AI 分析（核心功能）
│   ├── upload/                 # 影像上传
│   ├── reports/                # 报告管理
│   ├── admin/                  # 管理后台（用户 / 团队 / 权限）
│   ├── model-center/           # AI 模型中心
│   ├── permissions/            # 权限配置页
│   └── sync/                   # 数据同步
├── components/                  # 共享展示组件
│   ├── Header.tsx / Sidebar.tsx # 全局导航
│   ├── UserSettings.tsx        # 用户设置
│   ├── auth/                   # 认证相关组件
│   ├── common/                 # 通用基础组件
│   ├── dashboard/              # 仪表板图表/统计组件
│   ├── layout/                 # 布局组件
│   ├── medical/                # 医疗专用组件（DICOM 查看器、标注画布等）
│   ├── patients/               # 患者相关组件
│   ├── reports/                # 报告相关组件
│   └── ui/                     # 基础 UI 原语
├── services/                    # API 调用层（按业务域分组）
│   ├── imageServices/          # 影像文件、上传、AI 测量、标注
│   ├── patientServices/        # 患者 CRUD
│   ├── reportServices/         # 报告生成与查询
│   ├── dashboardServices/      # 仪表板数据
│   ├── dicomServices/          # DICOM 文件处理
│   ├── modelServices/          # AI 模型中心
│   ├── notificationServices/   # 系统通知
│   ├── permissionServices/     # 权限查询
│   ├── syncServices/           # 数据同步
│   ├── systemServices/         # 系统配置
│   ├── userService.ts          # 用户管理
│   ├── teamService.ts          # 团队管理
│   └── errorService.ts         # 统一错误处理
├── lib/
│   ├── api/                    # axios 客户端 + 请求拦截器
│   ├── logger/                 # 前端日志
│   └── utils.ts                # 通用工具函数
├── hooks/                       # 自定义 React Hooks
│   ├── useErrorHandler.ts
│   └── useLocalStorage.ts
├── types/
│   └── common.ts               # 公共 TypeScript 类型
├── utils/
│   └── idCardUtils.ts          # 身份证号工具
├── i18n/                        # 国际化（中文等）
│   ├── index.ts
│   └── locales/
├── docs/
│   └── ENVIRONMENT_VARIABLES.md # 环境变量完整说明
└── public/                      # 静态资源（图标、字体）
```

## 🚀 本地开发启动

### 前置要求

- **Node.js** 18+（`node -v` 检查）
- **npm** 8+
- 后端服务已在 http://localhost:8000 运行（见后端 README）

### 安装与启动

```bash
cd XieHe-System/frontend

# 安装依赖（首次或 package.json 变动后执行）
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 环境变量

前端通过 `.env.local` 读取配置，完整说明见 `docs/ENVIRONMENT_VARIABLES.md`。

最常用的配置项：

```bash
# 后端 API 地址（默认指向本地）
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

> `.env.local` 不提交到 Git，每个开发者本地维护自己的副本。

## 🔧 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript 5 |
| 样式 | Tailwind CSS v4 + clsx + tailwind-merge |
| UI 组件 | Radix UI + Headless UI + Lucide React + Framer Motion |
| 表单 | React Hook Form + Zod |
| 状态管理 | Redux Toolkit（全局）+ Zustand（局部）+ TanStack Query（服务端缓存）|
| 影像处理 | Cornerstone.js + cornerstone-wado-image-loader + dcmjs + dicom-parser |
| 绘图标注 | Fabric.js + Konva + react-konva |
| 图表 | Chart.js + react-chartjs-2 + Recharts |
| HTTP | axios（含 token 刷新拦截器）|
| 国际化 | 自定义 i18n（`i18n/` 目录）|
| 测试 | Jest + React Testing Library |

## 🧪 质量检查

每次提交前应运行：

```bash
cd XieHe-System/frontend

# TypeScript 类型检查
npm run type-check

# ESLint 代码检查
npm run lint

# 单元测试
npm run test

# 覆盖率报告
npm run test:coverage
```

涉及路由、Next.js 配置或大范围重构时还需执行：

```bash
npm run build
```

## 🚀 生产部署

```bash
# 构建生产镜像（内含 Nginx 静态服务）
docker build -t xiehe-frontend:local XieHe-System/frontend/

docker run -d -p 3000:80 xiehe-frontend:local
```

## 🛠️ 常见问题

### 无法连接后端 API

1. 确认后端已启动：`curl http://localhost:8000/health`
2. 检查 `.env.local` 中的 `NEXT_PUBLIC_API_BASE_URL` 是否指向正确地址（应为 `http://localhost:8000/api/v1`）
3. 查看浏览器 Network 面板确认请求发到了哪个地址

### Tailwind 样式不生效

```bash
# 清除缓存重启
rm -rf .next
npm run dev
```

### 依赖安装失败

```bash
rm -rf node_modules package-lock.json
npm install
```

### AI 分析按钮无反应 / 报错

前端的 AI 调用走后端代理（`POST /api/v1/image-files/{id}/ai/predict`），确认：
1. 后端正常运行
2. 本地 AI 容器已启动（见后端 README）
3. 浏览器 Network 面板中该请求是否返回非 200 状态码及错误信息

---

**注意**: `.env.local` 包含本地配置，不提交到 Git。
