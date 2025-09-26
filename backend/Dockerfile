# 医疗影像诊断系统 - 后端服务 Docker 镜像
# 多阶段构建，支持开发和生产环境

# 基础镜像
FROM python:3.11-slim as base

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 创建非root用户
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 设置工作目录
WORKDIR /app

# 开发环境
FROM base as development

# 复制依赖文件
COPY requirements-demo.txt requirements-dev.txt ./

# 安装开发依赖
RUN pip install --upgrade pip && \
    pip install -r requirements-demo.txt && \
    pip install -r requirements-dev.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads /app/models && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 8000

# 开发环境启动命令
CMD ["python", "start_demo.py"]

# 生产环境
FROM base as production

# 复制依赖文件
COPY requirements.txt ./

# 安装生产依赖
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads /app/models && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 生产环境启动命令
CMD ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]
