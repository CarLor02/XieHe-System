# 🏥 医疗影像诊断系统 - 前端应用

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4.1.14-38B2AC.svg)](https://tailwindcss.com)

## 📋 概述

基于 Next.js 15.5.4 的现代化医疗影像诊断系统前端应用，提供直观的用户界面和丰富的交互功能，支持DICOM影像查看、AI诊断结果展示、报告管理等核心功能。

### ✨ 特性

- 🚀 **现代化架构**: Next.js 15 + React 19 + TypeScript
- 🎨 **美观界面**: Tailwind CSS v4 + 响应式设计
- 🔒 **安全认证**: JWT + 多角色权限管理
- 📊 **数据可视化**: 实时仪表板 + 图表展示
- 📱 **移动适配**: PWA 支持 + 触摸友好
- 🧪 **完整测试**: Jest + Testing Library + Cypress

## 📁 目录结构

```
frontend/
├── README.md                    # 前端项目说明
├── package.json                 # 项目依赖和脚本
├── package-lock.json            # 依赖锁定文件
├── next.config.js               # Next.js 配置
├── tailwind.config.js           # Tailwind CSS 配置
├── tsconfig.json                # TypeScript 配置
├── .env.local.example           # 环境变量示例
├── .eslintrc.json              # ESLint 配置
├── .prettierrc                  # Prettier 配置
├── Dockerfile                   # Docker 镜像构建
├── app/                         # Next.js App Router
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局组件
│   ├── page.tsx                # 首页
│   ├── not-found.tsx           # 404 页面
│   ├── loading.tsx             # 加载页面
│   ├── error.tsx               # 错误页面
│   ├── auth/                   # 认证相关页面
│   │   ├── login/              # 登录页面
│   │   ├── register/           # 注册页面
│   │   └── forgot-password/    # 忘记密码页面
│   ├── dashboard/              # 仪表板页面
│   ├── patients/               # 患者管理页面
│   │   ├── page.tsx           # 患者列表
│   │   ├── [id]/              # 患者详情
│   │   └── new/               # 新建患者
│   ├── images/                 # 影像管理页面
│   │   ├── page.tsx           # 影像列表
│   │   ├── [id]/              # 影像详情
│   │   ├── upload/            # 影像上传
│   │   └── viewer/            # 影像查看器
│   ├── diagnosis/              # 诊断相关页面
│   │   ├── page.tsx           # 诊断列表
│   │   ├── [id]/              # 诊断详情
│   │   └── new/               # 新建诊断
│   ├── reports/                # 报告管理页面
│   │   ├── page.tsx           # 报告列表
│   │   ├── [id]/              # 报告详情
│   │   ├── new/               # 新建报告
│   │   └── templates/         # 报告模板
│   ├── settings/               # 系统设置页面
│   │   ├── profile/           # 个人资料
│   │   ├── security/          # 安全设置
│   │   └── preferences/       # 偏好设置
│   └── admin/                  # 管理员页面
│       ├── users/             # 用户管理
│       ├── roles/             # 角色管理
│       └── system/            # 系统管理
├── components/                  # 可复用组件
│   ├── ui/                     # 基础UI组件
│   │   ├── Button.tsx         # 按钮组件
│   │   ├── Input.tsx          # 输入框组件
│   │   ├── Modal.tsx          # 模态框组件
│   │   ├── Table.tsx          # 表格组件
│   │   ├── Card.tsx           # 卡片组件
│   │   ├── Badge.tsx          # 徽章组件
│   │   ├── Avatar.tsx         # 头像组件
│   │   ├── Spinner.tsx        # 加载动画
│   │   ├── Toast.tsx          # 提示消息
│   │   └── Tooltip.tsx        # 工具提示
│   ├── forms/                  # 表单组件
│   │   ├── PatientForm.tsx    # 患者表单
│   │   ├── ImageUploadForm.tsx # 影像上传表单
│   │   ├── DiagnosisForm.tsx  # 诊断表单
│   │   └── ReportForm.tsx     # 报告表单
│   ├── layout/                 # 布局组件
│   │   ├── Header.tsx         # 页面头部
│   │   ├── Sidebar.tsx        # 侧边栏
│   │   ├── Footer.tsx         # 页面底部
│   │   ├── Navigation.tsx     # 导航组件
│   │   └── Breadcrumb.tsx     # 面包屑导航
│   ├── charts/                 # 图表组件
│   │   ├── LineChart.tsx      # 折线图
│   │   ├── BarChart.tsx       # 柱状图
│   │   ├── PieChart.tsx       # 饼图
│   │   └── StatCard.tsx       # 统计卡片
│   └── medical/                # 医疗专用组件
│       ├── DicomViewer.tsx    # DICOM查看器
│       ├── ImageAnnotation.tsx # 影像标注
│       ├── DiagnosisResult.tsx # 诊断结果
│       └── ReportEditor.tsx   # 报告编辑器
├── lib/                        # 核心库和配置
│   ├── api.ts                 # API 客户端配置
│   ├── auth.ts                # 认证相关函数
│   ├── utils.ts               # 通用工具函数
│   ├── validations.ts         # 数据验证规则
│   ├── constants.ts           # 常量定义
│   ├── storage.ts             # 本地存储管理
│   ├── permissions.ts         # 权限管理
│   └── dicom.ts               # DICOM 处理工具
├── hooks/                      # 自定义 React Hooks
│   ├── useAuth.ts             # 认证状态管理
│   ├── useApi.ts              # API 请求管理
│   ├── useLocalStorage.ts     # 本地存储管理
│   ├── useDebounce.ts         # 防抖处理
│   ├── useInfiniteScroll.ts   # 无限滚动
│   ├── usePagination.ts       # 分页管理
│   ├── useWebSocket.ts        # WebSocket 连接
│   └── useDicomViewer.ts      # DICOM 查看器状态
├── types/                      # TypeScript 类型定义
│   ├── index.ts               # 导出所有类型
│   ├── api.ts                 # API 响应类型
│   ├── auth.ts                # 认证相关类型
│   ├── patient.ts             # 患者数据类型
│   ├── image.ts               # 影像数据类型
│   ├── diagnosis.ts           # 诊断数据类型
│   ├── report.ts              # 报告数据类型
│   ├── user.ts                # 用户数据类型
│   └── common.ts              # 通用类型定义
├── store/                      # 状态管理
│   ├── index.ts               # Store 配置
│   ├── authSlice.ts           # 认证状态
│   ├── patientSlice.ts        # 患者状态
│   ├── imageSlice.ts          # 影像状态
│   ├── diagnosisSlice.ts      # 诊断状态
│   ├── reportSlice.ts         # 报告状态
│   └── uiSlice.ts             # UI 状态
├── utils/                      # 工具函数
│   ├── format.ts              # 格式化工具
│   ├── date.ts                # 日期处理工具
│   ├── file.ts                # 文件处理工具
│   ├── image.ts               # 图像处理工具
│   ├── validation.ts          # 验证工具
│   ├── api.ts                 # API 工具
│   └── dicom.ts               # DICOM 工具
├── constants/                  # 常量定义
│   ├── index.ts               # 导出所有常量
│   ├── api.ts                 # API 相关常量
│   ├── routes.ts              # 路由常量
│   ├── messages.ts            # 消息常量
│   ├── colors.ts              # 颜色常量
│   └── medical.ts             # 医疗相关常量
├── styles/                     # 样式文件
│   ├── globals.css            # 全局样式
│   ├── components.css         # 组件样式
│   └── medical.css            # 医疗专用样式
└── public/                     # 静态资源
    ├── images/                # 图片资源
    ├── icons/                 # 图标资源
    ├── fonts/                 # 字体文件
    └── favicon.ico            # 网站图标
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+ (推荐 18.x LTS)
- **npm**: 8.0+ 或 **yarn**: 1.22+ 或 **pnpm**: 7.0+

### 安装步骤

1. **安装依赖**
   ```bash
   # 使用 npm
   npm install

   # 或使用 yarn
   yarn install

   # 或使用 pnpm
   pnpm install
   ```

2. **配置环境变量**（可选）
   ```bash
   # 如果需要自定义配置
   cp .env.test.example .env.test
   vim .env.test
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   # 或 yarn dev
   # 或 pnpm dev
   ```

4. **访问应用**
   - 前端应用: http://localhost:3000
   - 确保后端服务运行在: http://localhost:8000

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 或导出静态文件
npm run export
```

## 🔧 技术栈

### 核心框架
- **Next.js 15.5.4**: React 全栈框架 (App Router)
- **React 19.0**: 用户界面库
- **TypeScript 5.x**: 静态类型检查
- **Tailwind CSS v4.1.14**: 原子化CSS框架

### 状态管理
- **Redux Toolkit**: 全局状态管理
- **Zustand**: 轻量级状态管理
- **TanStack Query**: 服务端状态管理

### UI组件库
- **Headless UI**: 无样式组件库
- **Radix UI**: 高质量组件原语
- **Lucide React**: 图标库
- **React Hook Form**: 表单管理
- **Framer Motion**: 动画库

### 样式和主题
- **Tailwind CSS v4**: 原子化CSS
- **PostCSS**: CSS 后处理器
- **CSS Modules**: 模块化样式
- **clsx**: 条件类名工具

### 医疗专用库
- **Cornerstone.js**: DICOM影像查看
- **OHIF Viewer**: 医疗影像查看器
- **dcmjs**: DICOM文件处理
- **Chart.js**: 数据可视化

### 开发工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查
- **Jest**: 单元测试
- **Cypress**: 端到端测试

## 🎨 设计系统

### 颜色主题
- **Primary**: 医疗蓝色系
- **Secondary**: 辅助色彩
- **Success**: 成功状态色
- **Warning**: 警告状态色
- **Error**: 错误状态色

### 组件规范
- 遵循 Atomic Design 设计原则
- 支持深色/浅色主题切换
- 响应式设计，支持移动端
- 无障碍访问支持

## 🔒 安全特性

### 认证授权
- JWT令牌认证
- 角色权限控制
- 路由守卫保护
- 自动令牌刷新

### 数据安全
- 敏感数据加密传输
- XSS攻击防护
- CSRF保护
- 内容安全策略

## 📱 响应式设计

### 断点设置
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large**: > 1440px

### 适配策略
- 移动优先设计
- 触摸友好交互
- 自适应布局
- 性能优化

## 🧪 测试

### 测试框架
- **Jest**: 单元测试
- **React Testing Library**: 组件测试
- **Cypress**: 端到端测试
- **Storybook**: 组件文档

### 运行测试

```bash
# 单元测试
npm run test

# 端到端测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

## 📈 性能优化

### 构建优化
- 代码分割
- 树摇优化
- 图片优化
- 字体优化

### 运行时优化
- 懒加载
- 虚拟滚动
- 缓存策略
- 预加载

## 🚀 部署

### Docker部署

```bash
# 构建镜像
docker build -t medical-frontend .

# 运行容器
docker run -p 3000:3000 medical-frontend
```

### 静态部署

```bash
# 构建静态文件
npm run build
npm run export

# 部署到静态服务器
```

## 📊 监控分析

### 性能监控
- Core Web Vitals
- 页面加载时间
- 用户交互延迟
- 错误率统计

### 用户分析
- 页面访问统计
- 用户行为分析
- 功能使用情况
- 转化率分析

## 🛠️ 开发规范

### 代码规范
- 遵循 TypeScript 严格模式
- 使用 ESLint + Prettier
- 组件命名采用 PascalCase
- 文件命名采用 kebab-case

### 提交规范
- 使用 Conventional Commits
- 提交前自动代码检查
- 必须通过所有测试
- 代码审查通过

## 🛠️ 开发支持

### 开发工具
- **VS Code**: 推荐编辑器
- **React DevTools**: React调试工具
- **Redux DevTools**: 状态调试工具
- **Lighthouse**: 性能分析工具

### 故障排除

#### 样式问题
如果页面没有样式或样式加载不正确：

```bash
# 检查 Tailwind CSS 配置
npm run build  # 查看编译错误

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查 PostCSS 配置
# 确保 postcss.config.mjs 使用 @tailwindcss/postcss 插件
```

#### React Hooks 错误
如果遇到 "React has detected a change in the order of Hooks" 错误：
- 确保所有 Hooks 在组件顶层调用
- 不要在条件语句、循环或嵌套函数中调用 Hooks
- 避免在早期返回（early return）之后调用 Hooks

#### API 连接问题
如果前端无法连接后端：
- 确保后端服务运行在 http://localhost:8080
- 检查浏览器控制台是否有 CORS 错误
- 确认后端 CORS 配置允许 http://localhost:3000

#### 依赖冲突
如果遇到依赖版本冲突：
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用 npm ci 进行干净安装
npm ci
```

### 调试技巧
- 使用浏览器开发者工具
- React DevTools 组件调试
- Network 面板 API 调试
- Console 日志调试

### 开发模式 vs 生产模式

| 特性 | 开发模式 | 生产模式 |
|------|----------|----------|
| 热重载 | ✅ 支持 | ❌ 不支持 |
| 源码映射 | ✅ 详细 | ⚠️ 简化 |
| 代码压缩 | ❌ 不压缩 | ✅ 压缩 |
| 错误边界 | 🔍 详细错误 | 🛡️ 用户友好 |
| 性能 | 🐌 较慢 | 🚀 优化 |

---

**注意**:
- 开发前请仔细阅读项目编码规范和组件设计文档
- 确保后端服务正常运行再启动前端
- 遇到问题请先查看故障排除部分