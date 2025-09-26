"""
Gunicorn 配置文件

用于生产环境的 WSGI 服务器配置，优化了性能和稳定性。

配置说明:
- 使用 uvicorn worker 支持异步处理
- 根据 CPU 核心数自动调整 worker 数量
- 配置了合适的超时时间和内存限制
- 启用了访问日志和错误日志
"""

import multiprocessing
import os

# 服务器配置
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = int(os.getenv('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100

# 超时配置
timeout = 120
keepalive = 5
graceful_timeout = 30

# 进程管理
preload_app = True
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# 日志配置
accesslog = "-"
errorlog = "-"
loglevel = os.getenv('LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# SSL 配置 (如果需要)
keyfile = os.getenv('SSL_KEYFILE')
certfile = os.getenv('SSL_CERTFILE')

# 性能优化
worker_tmp_dir = "/dev/shm"
forwarded_allow_ips = "*"
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}

# 启动钩子
def on_starting(server):
    """服务器启动时的钩子函数"""
    server.log.info("医疗影像诊断系统后端服务启动中...")

def on_reload(server):
    """服务器重载时的钩子函数"""
    server.log.info("医疗影像诊断系统后端服务重载中...")

def when_ready(server):
    """服务器准备就绪时的钩子函数"""
    server.log.info("医疗影像诊断系统后端服务已就绪")

def on_exit(server):
    """服务器退出时的钩子函数"""
    server.log.info("医疗影像诊断系统后端服务正在关闭...")

def worker_int(worker):
    """Worker 进程中断时的钩子函数"""
    worker.log.info(f"Worker {worker.pid} 收到中断信号")

def pre_fork(server, worker):
    """Worker 进程 fork 前的钩子函数"""
    server.log.info(f"Worker {worker.pid} 即将启动")

def post_fork(server, worker):
    """Worker 进程 fork 后的钩子函数"""
    server.log.info(f"Worker {worker.pid} 已启动")

def post_worker_init(worker):
    """Worker 进程初始化后的钩子函数"""
    worker.log.info(f"Worker {worker.pid} 初始化完成")

def worker_abort(worker):
    """Worker 进程异常终止时的钩子函数"""
    worker.log.info(f"Worker {worker.pid} 异常终止")

def pre_exec(server):
    """执行前的钩子函数"""
    server.log.info("服务器即将执行")

def pre_request(worker, req):
    """请求处理前的钩子函数"""
    worker.log.debug(f"{req.method} {req.path}")

def post_request(worker, req, environ, resp):
    """请求处理后的钩子函数"""
    worker.log.debug(f"{req.method} {req.path} - {resp.status_code}")

# 环境变量配置
raw_env = [
    f"DATABASE_URL={os.getenv('DATABASE_URL', '')}",
    f"REDIS_URL={os.getenv('REDIS_URL', '')}",
    f"JWT_SECRET_KEY={os.getenv('JWT_SECRET_KEY', '')}",
    f"ENVIRONMENT={os.getenv('ENVIRONMENT', 'production')}",
]
