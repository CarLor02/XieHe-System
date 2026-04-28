"""Schemas for the review API endpoints."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class ReviewStatus(str, Enum):
    DRAFT = "draft"              # 草稿
    PENDING = "pending"          # 待审核
    IN_REVIEW = "in_review"      # 审核中
    APPROVED = "approved"        # 已通过
    REJECTED = "rejected"        # 已拒绝
    REVISION = "revision"        # 需修改
    FINAL = "final"              # 最终版本


class ReviewAction(str, Enum):
    SUBMIT = "submit"            # 提交审核
    APPROVE = "approve"          # 通过
    REJECT = "reject"            # 拒绝
    REQUEST_REVISION = "request_revision"  # 要求修改
    REVISE = "revise"            # 修改后重新提交
    FINALIZE = "finalize"        # 最终确认


class ReviewLevel(str, Enum):
    PRIMARY = "primary"          # 初审
    SECONDARY = "secondary"      # 复审
    FINAL = "final"              # 终审


class ReviewSubmissionRequest(BaseModel):
    report_id: str = Field(..., description="报告ID")
    reviewer_notes: Optional[str] = Field(None, description="提交说明")


class ReviewActionRequest(BaseModel):
    report_id: str = Field(..., description="报告ID")
    action: ReviewAction = Field(..., description="审核动作")
    comments: Optional[str] = Field(None, description="审核意见")
    signature_data: Optional[str] = Field(None, description="电子签名数据")
    next_reviewer_id: Optional[str] = Field(None, description="下一级审核员ID")


class ReviewConfigRequest(BaseModel):
    report_type: str = Field(..., description="报告类型")
    review_levels: List[ReviewLevel] = Field(..., description="审核级别")
    required_reviewers: Dict[str, List[str]] = Field(..., description="各级别必需审核员")
    auto_approval_rules: Optional[Dict[str, Any]] = Field(None, description="自动审核规则")


class ReviewHistoryItem(BaseModel):
    id: str
    report_id: str
    reviewer_id: str
    reviewer_name: str
    review_level: ReviewLevel
    action: ReviewAction
    status: ReviewStatus
    comments: Optional[str]
    signature_data: Optional[str]
    created_at: datetime
    updated_at: datetime


class ReviewStatusResponse(BaseModel):
    report_id: str
    current_status: ReviewStatus
    current_level: Optional[ReviewLevel]
    current_reviewer_id: Optional[str]
    current_reviewer_name: Optional[str]
    review_history: List[ReviewHistoryItem]
    next_reviewers: List[Dict[str, str]]
    can_edit: bool
    can_submit: bool
    can_review: bool
    estimated_completion: Optional[datetime]


class ReviewStatistics(BaseModel):
    total_reports: int
    pending_reviews: int
    completed_reviews: int
    average_review_time: float
    review_by_status: Dict[str, int]
    review_by_level: Dict[str, int]
    reviewer_workload: Dict[str, int]
