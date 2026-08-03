"""系统管理上下文拥有的 SQLAlchemy 模型。"""

import enum

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    Integer,
    String,
    Text,
    func,
)

from app.shared.database.sqlalchemy import Base


class ConfigTypeEnum(str, enum.Enum):
    SYSTEM = "SYSTEM"
    DATABASE = "DATABASE"
    SECURITY = "SECURITY"
    NOTIFICATION = "NOTIFICATION"
    AI = "AI"
    DICOM = "DICOM"
    STORAGE = "STORAGE"
    NETWORK = "NETWORK"
    UI = "UI"
    WORKFLOW = "WORKFLOW"


class DataTypeEnum(str, enum.Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    JSON = "JSON"
    ARRAY = "ARRAY"
    DATE = "DATE"
    DATETIME = "DATETIME"


class SystemConfig(Base):
    """系统配置表。"""

    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="配置ID")
    config_key = Column(String(100), unique=True, nullable=False, comment="配置键")
    config_name = Column(String(200), nullable=False, comment="配置名称")
    config_type = Column(Enum(ConfigTypeEnum), nullable=False, comment="配置类型")
    data_type = Column(Enum(DataTypeEnum), nullable=False, comment="数据类型")
    config_value = Column(Text, comment="配置值")
    default_value = Column(Text, comment="默认值")
    description = Column(Text, comment="描述")
    is_required = Column(Boolean, default=False, comment="是否必需")
    is_encrypted = Column(Boolean, default=False, comment="是否加密")
    is_readonly = Column(Boolean, default=False, comment="是否只读")
    is_system = Column(Boolean, default=False, comment="是否系统配置")
    validation_rules = Column(JSON, comment="验证规则")
    allowed_values = Column(JSON, comment="允许的值")
    min_value = Column(Float, comment="最小值")
    max_value = Column(Float, comment="最大值")
    config_group = Column(String(100), comment="配置组")
    sort_order = Column(Integer, comment="排序")
    is_active = Column(Boolean, default=True, comment="是否激活")
    last_modified_at = Column(DateTime, comment="最后修改时间")
    last_modified_by = Column(Integer, comment="最后修改人ID")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
