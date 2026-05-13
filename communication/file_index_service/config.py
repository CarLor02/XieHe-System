"""
文件索引服务配置

从 .env 文件读取，所有配置项均可通过环境变量覆盖。
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── 服务 ──────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 9000
    DEBUG: bool = False

    # ── 鉴权 ──────────────────────────────────────────────────
    # 主服务端请求时在 Header 中携带：X-API-Key: <value>
    # 为空字符串时关闭鉴权（仅限内网可信环境）
    API_KEY: str = ""

    # ── 扫描目录 ───────────────────────────────────────────────
    WATCH_PATH: str = "/data/dicom"

    # 扫描时跳过的扩展名（逗号分隔）：非图像辅助文件
    SKIP_EXTENSIONS: str = ".sml,.db,.log,.txt,.json,.xml,.csv"

    # ── 定时扫描 ───────────────────────────────────────────────
    # 自动扫描间隔（秒），0 = 禁用自动扫描，仅手动触发
    SCAN_INTERVAL: int = 300

    # ── 数据库 ────────────────────────────────────────────────
    DB_PATH: str = "./file_index.db"

    # ── 日志 ──────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/file_index.log"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    # ── 派生属性 ──────────────────────────────────────────────
    @property
    def skip_extensions(self) -> set:
        """返回需要跳过的扩展名集合（小写，含点）"""
        return {e.strip().lower() for e in self.SKIP_EXTENSIONS.split(",") if e.strip()}


settings = Settings()

# 确保日志目录存在
Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
