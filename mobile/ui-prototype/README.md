# 移动端 UI 参考原型

这是独立的 React + Vite HTML 原型，用于查看信息结构、紫色主题及交互草图。
真正的 Android / iOS 应用在上一级 `mobile/src/`，不运行这套 HTML 页面。

```bash
cd mobile/ui-prototype
npm ci --workspaces=false
npm run dev -- --host 127.0.0.1 --port 4173
```

打开 `http://127.0.0.1:4173`。检查命令为 `npm run type-check`、`npm run lint`、
`npm run build`。原型自带独立锁文件，不加入根目录 npm workspace。

所有数据和成功提示均为模拟，包含登录、上传、AI 测量、标注保存及报告审核。
原型依赖外部图标 CDN 和 Readdy 图片服务，离线时部分图片或图标可能不可用。
原生应用应使用本地资源或后端真实影像，不把这些 URL 和模拟业务结果当作正式实现。
