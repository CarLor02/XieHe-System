"""
文件索引服务配置

从 .env 文件读取，所有配置项均可通过环境变量覆盖。
"""

import re
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

    # 月份文件夹名正则，匹配 IMG 开头的格式，如 IMG2602（26年02月）
    # 格式：IMG + YY(年份后两位) + MM(月份)
    MONTH_FOLDER_PATTERN: str = r"^IMG\d{4}$"

    # 视为"主影像"的扩展名列表（逗号分隔）；空扩展名文件始终视为主影像
    PRIMARY_EXTENSIONS: str = ".dcm,.dicom"

    # 扫描时跳过的扩展名（逗号分隔）
    SKIP_EXTENSIONS: str = ".sml"

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
    def month_pattern(self) -> re.Pattern:
        return re.compile(self.MONTH_FOLDER_PATTERN)

    @property
    def primary_extensions(self) -> set:
        """返回主影像扩展名集合（小写，含点），空扩展名文件额外判断"""
        return {e.strip().lower() for e in self.PRIMARY_EXTENSIONS.split(",") if e.strip()}

    @property
    def skip_extensions(self) -> set:
        """返回需要跳过的扩展名集合（小写，含点）"""
        return {e.strip().lower() for e in self.SKIP_EXTENSIONS.split(",") if e.strip()}


settings = Settings()

# 确保日志目录存在
Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
