"""部署探针与服务元数据的公开返回模型。"""

from pydantic import BaseModel


class ApiRootResult(BaseModel):
    message: str
    version: str
    docs_url: str
    redoc_url: str


class HealthProbeResult(BaseModel):
    status: str
    message: str


class ApplicationInfoResult(BaseModel):
    name: str
    description: str
    version: str
    environment: str
    debug: bool
    api_version: str
