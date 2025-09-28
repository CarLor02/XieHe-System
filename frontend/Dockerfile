# 医疗影像诊断系统 - 前端应用 Docker 镜像
# 生产部署环境

# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache libc6-compat

# 复制包管理文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN npm run build

# 生产运行时镜像 - 使用nginx提供静态文件服务
FROM nginx:alpine AS production

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制构建产物到nginx目录
COPY --from=builder /app/out /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
