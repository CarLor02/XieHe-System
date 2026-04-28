"""Schemas for the signature API endpoints."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class SignatureType(str, Enum):
    HANDWRITTEN = "handwritten"     # 手写签名
    DIGITAL = "digital"             # 数字签名
    BIOMETRIC = "biometric"         # 生物识别签名
    PIN = "pin"                     # PIN码签名


class SignatureStatus(str, Enum):
    VALID = "valid"                 # 有效
    INVALID = "invalid"             # 无效
    EXPIRED = "expired"             # 已过期
    REVOKED = "revoked"             # 已撤销


class CreateSignatureRequest(BaseModel):
    document_id: str = Field(..., description="文档ID")
    document_type: str = Field(..., description="文档类型")
    signature_data: str = Field(..., description="签名数据(Base64)")
    signature_type: SignatureType = Field(..., description="签名类型")
    signer_id: str = Field(..., description="签名者ID")
    signer_name: str = Field(..., description="签名者姓名")
    signature_reason: Optional[str] = Field(None, description="签名原因")
    signature_location: Optional[str] = Field(None, description="签名地点")
    biometric_data: Optional[str] = Field(None, description="生物识别数据")


class VerifySignatureRequest(BaseModel):
    signature_id: str = Field(..., description="签名ID")
    document_hash: Optional[str] = Field(None, description="文档哈希值")


class SignatureTemplateRequest(BaseModel):
    template_name: str = Field(..., description="模板名称")
    template_data: str = Field(..., description="模板数据(Base64)")
    user_id: str = Field(..., description="用户ID")
    is_default: bool = Field(False, description="是否为默认模板")


class SignatureInfo(BaseModel):
    id: str
    document_id: str
    document_type: str
    signature_type: SignatureType
    signer_id: str
    signer_name: str
    signature_data: str
    signature_hash: str
    signature_reason: Optional[str]
    signature_location: Optional[str]
    status: SignatureStatus
    created_at: datetime
    expires_at: Optional[datetime]
    verification_count: int
    last_verified_at: Optional[datetime]


class SignatureVerificationResult(BaseModel):
    signature_id: str
    is_valid: bool
    status: SignatureStatus
    verification_details: Dict[str, Any]
    verified_at: datetime
    verifier_info: Optional[Dict[str, str]]


class SignatureTemplate(BaseModel):
    id: str
    template_name: str
    template_data: str
    user_id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
    usage_count: int


class SignatureStatistics(BaseModel):
    total_signatures: int
    valid_signatures: int
    expired_signatures: int
    revoked_signatures: int
    signatures_by_type: Dict[str, int]
    signatures_by_user: Dict[str, int]
    daily_signature_count: List[Dict[str, Any]]
    verification_success_rate: float
