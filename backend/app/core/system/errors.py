"""
错误码定义模块

定义系统中所有的错误码、HTTP状态码映射和错误消息映射。
"""

from enum import Enum
from typing import Dict


class ErrorCode(str, Enum):
    """错误码枚举"""

    # 1xxx - 通用错误
    SUCCESS = "SUCCESS"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    INVALID_REQUEST = "INVALID_REQUEST"
    OPERATION_FAILED = "OPERATION_FAILED"

    # 2xxx - 认证授权错误
    AUTH_FAILED = "AUTH_FAILED"
    AUTH_CREDENTIALS_INVALID = "AUTH_CREDENTIALS_INVALID"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_MISSING = "AUTH_TOKEN_MISSING"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"

    # 3xxx - 用户相关错误
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    USER_INACTIVE = "USER_INACTIVE"
    USER_LOCKED = "USER_LOCKED"
    USERNAME_TAKEN = "USERNAME_TAKEN"
    EMAIL_TAKEN = "EMAIL_TAKEN"
    PASSWORD_INCORRECT = "PASSWORD_INCORRECT"
    PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK"

    # 3xxx - 患者相关错误
    PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND"
    PATIENT_ALREADY_EXISTS = "PATIENT_ALREADY_EXISTS"
    PATIENT_ID_NUMBER_EXISTS = "PATIENT_ID_NUMBER_EXISTS"

    # 3xxx - 影像相关错误
    IMAGE_NOT_FOUND = "IMAGE_NOT_FOUND"
    IMAGE_UPLOAD_FAILED = "IMAGE_UPLOAD_FAILED"
    IMAGE_PROCESSING_FAILED = "IMAGE_PROCESSING_FAILED"
    IMAGE_FORMAT_INVALID = "IMAGE_FORMAT_INVALID"
    IMAGE_SIZE_EXCEEDED = "IMAGE_SIZE_EXCEEDED"

    # 3xxx - 报告相关错误
    REPORT_NOT_FOUND = "REPORT_NOT_FOUND"
    REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED"
    REPORT_ALREADY_EXISTS = "REPORT_ALREADY_EXISTS"

    # 3xxx - 标注相关错误
    ANNOTATION_NOT_FOUND = "ANNOTATION_NOT_FOUND"
    ANNOTATION_INVALID = "ANNOTATION_INVALID"

    # 3xxx - AI诊断相关错误
    AI_DIAGNOSIS_FAILED = "AI_DIAGNOSIS_FAILED"
    AI_MODEL_NOT_AVAILABLE = "AI_MODEL_NOT_AVAILABLE"
    AI_PROCESSING_TIMEOUT = "AI_PROCESSING_TIMEOUT"

    # 4xxx - 数据验证错误
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_EMAIL_INVALID = "VALIDATION_EMAIL_INVALID"
    VALIDATION_PHONE_INVALID = "VALIDATION_PHONE_INVALID"
    VALIDATION_ID_NUMBER_INVALID = "VALIDATION_ID_NUMBER_INVALID"
    VALIDATION_DATE_INVALID = "VALIDATION_DATE_INVALID"
    VALIDATION_REQUIRED_FIELD_MISSING = "VALIDATION_REQUIRED_FIELD_MISSING"

    # 5xxx - 系统错误
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    DATABASE_CONNECTION_FAILED = "DATABASE_CONNECTION_FAILED"
    FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"


# 错误码与HTTP状态码映射
ERROR_CODE_HTTP_STATUS_MAP: Dict[str, int] = {
    # 1xxx - 通用错误
    ErrorCode.SUCCESS: 200,
    ErrorCode.UNKNOWN_ERROR: 500,
    ErrorCode.RESOURCE_NOT_FOUND: 404,
    ErrorCode.INVALID_REQUEST: 400,
    ErrorCode.OPERATION_FAILED: 400,

    # 2xxx - 认证授权错误
    ErrorCode.AUTH_FAILED: 401,
    ErrorCode.AUTH_CREDENTIALS_INVALID: 401,
    ErrorCode.AUTH_TOKEN_INVALID: 401,
    ErrorCode.AUTH_TOKEN_EXPIRED: 401,
    ErrorCode.AUTH_TOKEN_MISSING: 401,
    ErrorCode.PERMISSION_DENIED: 403,
    ErrorCode.INSUFFICIENT_PERMISSIONS: 403,

    # 3xxx - 用户相关错误
    ErrorCode.USER_NOT_FOUND: 404,
    ErrorCode.USER_ALREADY_EXISTS: 409,
    ErrorCode.USER_INACTIVE: 403,
    ErrorCode.USER_LOCKED: 403,
    ErrorCode.USERNAME_TAKEN: 409,
    ErrorCode.EMAIL_TAKEN: 409,
    ErrorCode.PASSWORD_INCORRECT: 401,
    ErrorCode.PASSWORD_TOO_WEAK: 400,

    # 3xxx - 患者相关错误
    ErrorCode.PATIENT_NOT_FOUND: 404,
    ErrorCode.PATIENT_ALREADY_EXISTS: 409,
    ErrorCode.PATIENT_ID_NUMBER_EXISTS: 409,

    # 3xxx - 影像相关错误
    ErrorCode.IMAGE_NOT_FOUND: 404,
    ErrorCode.IMAGE_UPLOAD_FAILED: 500,
    ErrorCode.IMAGE_PROCESSING_FAILED: 500,
    ErrorCode.IMAGE_FORMAT_INVALID: 400,
    ErrorCode.IMAGE_SIZE_EXCEEDED: 413,

    # 3xxx - 报告相关错误
    ErrorCode.REPORT_NOT_FOUND: 404,
    ErrorCode.REPORT_GENERATION_FAILED: 500,
    ErrorCode.REPORT_ALREADY_EXISTS: 409,

    # 3xxx - 标注相关错误
    ErrorCode.ANNOTATION_NOT_FOUND: 404,
    ErrorCode.ANNOTATION_INVALID: 400,

    # 3xxx - AI诊断相关错误
    ErrorCode.AI_DIAGNOSIS_FAILED: 500,
    ErrorCode.AI_MODEL_NOT_AVAILABLE: 503,
    ErrorCode.AI_PROCESSING_TIMEOUT: 504,

    # 4xxx - 数据验证错误
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.VALIDATION_EMAIL_INVALID: 422,
    ErrorCode.VALIDATION_PHONE_INVALID: 422,
    ErrorCode.VALIDATION_ID_NUMBER_INVALID: 422,
    ErrorCode.VALIDATION_DATE_INVALID: 422,
    ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING: 422,

    # 5xxx - 系统错误
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.DATABASE_ERROR: 500,
    ErrorCode.DATABASE_CONNECTION_FAILED: 503,
    ErrorCode.FILE_SYSTEM_ERROR: 500,
    ErrorCode.EXTERNAL_SERVICE_ERROR: 502,
    ErrorCode.CONFIGURATION_ERROR: 500,
}


# 错误码与中文消息映射
ERROR_CODE_MESSAGE_MAP: Dict[str, str] = {
    # 1xxx - 通用错误
    ErrorCode.SUCCESS: "操作成功",
    ErrorCode.UNKNOWN_ERROR: "未知错误",
    ErrorCode.RESOURCE_NOT_FOUND: "资源不存在",
    ErrorCode.INVALID_REQUEST: "无效的请求",
    ErrorCode.OPERATION_FAILED: "操作失败",

    # 2xxx - 认证授权错误
    ErrorCode.AUTH_FAILED: "认证失败",
    ErrorCode.AUTH_CREDENTIALS_INVALID: "用户名或密码错误",
    ErrorCode.AUTH_TOKEN_INVALID: "令牌无效",
    ErrorCode.AUTH_TOKEN_EXPIRED: "令牌已过期",
    ErrorCode.AUTH_TOKEN_MISSING: "缺少认证令牌",
    ErrorCode.PERMISSION_DENIED: "权限不足",
    ErrorCode.INSUFFICIENT_PERMISSIONS: "权限不足，无法执行此操作",

    # 3xxx - 用户相关错误
    ErrorCode.USER_NOT_FOUND: "用户不存在",
    ErrorCode.USER_ALREADY_EXISTS: "用户已存在",
    ErrorCode.USER_INACTIVE: "用户未激活",
    ErrorCode.USER_LOCKED: "用户已被锁定",
    ErrorCode.USERNAME_TAKEN: "用户名已被使用",
    ErrorCode.EMAIL_TAKEN: "邮箱已被使用",
    ErrorCode.PASSWORD_INCORRECT: "密码错误",
    ErrorCode.PASSWORD_TOO_WEAK: "密码强度不足",

    # 3xxx - 患者相关错误
    ErrorCode.PATIENT_NOT_FOUND: "患者不存在",
    ErrorCode.PATIENT_ALREADY_EXISTS: "患者已存在",
    ErrorCode.PATIENT_ID_NUMBER_EXISTS: "身份证号已存在",

    # 3xxx - 影像相关错误
    ErrorCode.IMAGE_NOT_FOUND: "影像不存在",
    ErrorCode.IMAGE_UPLOAD_FAILED: "影像上传失败",
    ErrorCode.IMAGE_PROCESSING_FAILED: "影像处理失败",
    ErrorCode.IMAGE_FORMAT_INVALID: "影像格式不支持",
    ErrorCode.IMAGE_SIZE_EXCEEDED: "影像文件过大",

    # 3xxx - 报告相关错误
    ErrorCode.REPORT_NOT_FOUND: "报告不存在",
    ErrorCode.REPORT_GENERATION_FAILED: "报告生成失败",
    ErrorCode.REPORT_ALREADY_EXISTS: "报告已存在",

    # 3xxx - 标注相关错误
    ErrorCode.ANNOTATION_NOT_FOUND: "标注不存在",
    ErrorCode.ANNOTATION_INVALID: "标注数据无效",

    # 3xxx - AI诊断相关错误
    ErrorCode.AI_DIAGNOSIS_FAILED: "AI诊断失败",
    ErrorCode.AI_MODEL_NOT_AVAILABLE: "AI模型不可用",
    ErrorCode.AI_PROCESSING_TIMEOUT: "AI处理超时",

    # 4xxx - 数据验证错误
    ErrorCode.VALIDATION_ERROR: "数据验证失败",
    ErrorCode.VALIDATION_EMAIL_INVALID: "邮箱格式不正确",
    ErrorCode.VALIDATION_PHONE_INVALID: "手机号格式不正确",
    ErrorCode.VALIDATION_ID_NUMBER_INVALID: "身份证号格式不正确",
    ErrorCode.VALIDATION_DATE_INVALID: "日期格式不正确",
    ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING: "必填字段缺失",

    # 5xxx - 系统错误
    ErrorCode.INTERNAL_ERROR: "系统内部错误",
    ErrorCode.DATABASE_ERROR: "数据库错误",
    ErrorCode.DATABASE_CONNECTION_FAILED: "数据库连接失败",
    ErrorCode.FILE_SYSTEM_ERROR: "文件系统错误",
    ErrorCode.EXTERNAL_SERVICE_ERROR: "外部服务错误",
    ErrorCode.CONFIGURATION_ERROR: "配置错误",
}


def get_http_status_code(error_code: str) -> int:
    """
    根据错误码获取HTTP状态码

    Args:
        error_code: 错误码

    Returns:
        HTTP状态码，默认返回500
    """
    return ERROR_CODE_HTTP_STATUS_MAP.get(error_code, 500)


def get_error_message(error_code: str) -> str:
    """
    根据错误码获取错误消息

    Args:
        error_code: 错误码

    Returns:
        错误消息，默认返回"未知错误"
    """
    return ERROR_CODE_MESSAGE_MAP.get(error_code, "未知错误")
