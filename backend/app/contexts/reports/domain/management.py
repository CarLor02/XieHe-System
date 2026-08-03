"""报告管理领域规则。"""

from __future__ import annotations

from datetime import datetime


class ReportManagementError(ValueError):
    """报告管理领域错误基类。"""


class ReportNotFound(ReportManagementError):
    def __init__(self, report_id: int) -> None:
        super().__init__(f"报告 ID {report_id} 不存在")
        self.report_id = report_id


class ReportPatientNotFound(ReportManagementError):
    def __init__(self, patient_id: int) -> None:
        super().__init__(f"患者 ID {patient_id} 不存在")
        self.patient_id = patient_id


class ReportNotEditable(ReportManagementError):
    """报告当前状态不允许编辑。"""


class ReportNotDeletable(ReportManagementError):
    """报告当前状态不允许删除。"""


_PRIORITIES = {"LOW", "NORMAL", "HIGH", "URGENT", "STAT"}


def normalize_report_priority(value: str | None) -> str:
    """将 API 优先级归一化为数据库枚举值。"""

    normalized = (value or "normal").upper()
    return normalized if normalized in _PRIORITIES else "NORMAL"


def report_priority_to_api(value: str | None) -> str:
    return normalize_report_priority(value).lower()


def ensure_report_editable(status: str) -> None:
    if status.upper() in {"FINALIZED", "ARCHIVED"}:
        raise ReportNotEditable("已完成或已归档的报告不允许修改")


def ensure_report_deletable(status: str) -> None:
    if status.upper() == "FINALIZED":
        raise ReportNotDeletable("已完成的报告不允许删除")


def generate_report_number(now: datetime, token: str) -> str:
    """生成与历史接口兼容的报告编号。"""

    return f"RPT{now.strftime('%Y%m%d')}{token[:8].upper()}"
