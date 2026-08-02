"""Pure rules for converting measurements into AP/LAT report text."""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any

from .models import ReportMeasurement, UnsupportedExamType

AP_EXAM_TYPE = "正位X光片"
LATERAL_EXAM_TYPE = "侧位X光片"

AP_REPORT_TEMPLATE = """# 脊柱X光正位影像分析报告

## 【基本测量数据】
| 测量项目 | 测量值 | 参考/备注 |
| :--- | :--- | :--- |
| **Cobb角 (Main Curve)** | {{Cobb_Angle}}° | 主弯角度 |
| **椎体旋转 (Nash-Moe)** | {{Nash_Moe_Grade}}级 | 0级(正常)-IV级(严重) |
| **T1 倾斜角 (T1 Tilt)** | {{T1_Tilt}}° | 上胸椎/肩部平衡参考 |
| **锁骨角 (CA)** | {{CA_Value}}° | >10°提示外观不对称 |
| **骨盆倾斜角 (Pelvic Obliquity)** | {{Pelvic_Obliquity}}° | 髂嵴连线与水平线夹角 |
| **躯干偏移 (Trunk Shift/C7-CSVL)**| {{Trunk_Shift}} mm | >10mm提示失平衡 |
| **C7偏移距离 (C7 shift)** | {{C7_Shift}} mm | C7铅垂线与CSVL距离 |
| **顶椎偏移 (AVT)** | {{AVT_Value}} mm | 顶椎中心至CSVL距离 |

## 【影像学分析】

1.  **脊柱形态评价 (Scoliosis Assessment)：**
    *   主弯 Cobb 角测量为 **{{Cobb_Angle}}°**。
    {{IF Cobb_Angle < 10}}*   测量值未达到侧弯诊断标准（<10°），属于脊柱生理性不对称。{{END IF}}
    {{IF Cobb_Angle >= 10}}*   提示存在脊柱侧弯畸形，程度判定为 **{{Severity_Level}}**。{{END IF}}
    {{IF Nash_Moe_Grade > 0}}*   顶椎旋转度评估为 **Nash-Moe {{Nash_Moe_Grade}} 级**，提示存在椎体轴向旋转。{{END IF}}

2.  **冠状面平衡 (Coronal Balance)：**
    *   C7铅垂线 (C7PL) 相对于骶骨中心垂直线 (CSVL) 向{{Direction}}偏移 **{{Trunk_Shift}} mm**。
    {{IF Trunk_Shift > 10}}*   提示存在躯干失平衡 (Decompensated)。{{END IF}}
    {{IF Trunk_Shift <= 10}}*   躯干冠状面整体平衡维持良好。{{END IF}}

3.  **骨盆与肩部对称性：**
    *   **肩部：** 锁骨角 (CA) 为 {{CA_Value}}°。{{IF CA_Value > 10}} 存在肉眼可见的肩部不等高 (高低肩)。{{END IF}}
    *   **骨盆：** 骨盆倾斜角为 {{Pelvic_Obliquity}}°。{{IF Pelvic_Obliquity > 2}} 提示可能存在双下肢不等长或骨盆倾斜。{{END IF}}

## 【结论建议】
*   当前主要问题：{{Summary_Text}}。
*   建议结合临床体征（如剃刀背试验）综合评估。
{{IF Cobb_Angle > 20}}*   建议定期复查或咨询专科医生进行干预。{{END IF}}

---
报告生成时间：{{Generated_Time}}
系统：AI辅助测量分析
"""

LATERAL_REPORT_TEMPLATE = """# 脊柱X光侧位影像分析报告

## 【基本测量数据】
| 测量项目 | 测量值 | 参考/公式校验 |
| :--- | :--- | :--- |
| **矢状面垂直轴 (SVA)** | {{SVA_Value}} mm | <50mm为平衡 |
| **颈椎前凸角 (CL)** | {{CL_Value}}° | C2-C7 |
| **胸椎后凸角 (TK)** | {{TK_Value}}° | T5-T12 (或T2-T5/T2-T12) |
| **腰椎前凸角 (LL)** | {{LL_Value}}° | L1-S1 |
| **骨盆入射角 (PI)** | {{PI_Value}}° | 解剖恒定参数 |
| **骨盆倾斜角 (PT)** | {{PT_Value}}° | 反映骨盆代偿 |
| **骶骨倾斜角 (SS)** | {{SS_Value}}° | PI = PT + SS |
| **T1骨盆角 (TPA)** | {{TPA_Value}}° | 整体平衡综合指标 |

## 【影像学分析】

1.  **矢状面整体平衡 (Global Balance)：**
    *   C7铅垂线至S1后上角的水平距离 (SVA) 为 **{{SVA_Value}} mm**。
    {{IF SVA_Value > 50}}*   结果提示 **矢状面失衡 (Positive Imbalance)**，躯干重心明显前移。需关注TPA指标（当前为 {{TPA_Value}}°）。{{END IF}}
    {{IF SVA_Value <= 50}}*   矢状面整体平衡维持在正常范围内 (<50mm)。{{END IF}}

2.  **脊柱区域曲度 (Spinal Curvature)：**
    *   **颈椎 (CL)：** {{CL_Value}}°。{{IF CL_Value < 0}} 提示颈椎生理曲度变直或反弓。{{END IF}}
    *   **胸椎 (TK)：** {{TK_Value}}°。
    *   **腰椎 (LL)：** {{LL_Value}}°。

3.  **骨盆参数分析 (Spinopelvic Parameters)：**
    *   骨盆形态学参数 PI 为 {{PI_Value}}°。
    *   当前骨盆位置参数：PT={{PT_Value}}°, SS={{SS_Value}}°。
    *   *数据校验：* PI ≈ PT + SS ({{PI_Value}} vs {{PT_Plus_SS}})，数据吻合度{{IF Gap < 3}}良好{{END IF}}{{IF Gap >= 3}}存在偏差，建议复核关键点{{END IF}}。
    {{IF PT_Value > 20}}*   PT值较高，提示骨盆后旋 (Retroversion) 以代偿躯干前倾。{{END IF}}

## 【结论建议】
*   脊柱矢状面序列：{{IF SVA_Value > 50}}失衡{{END IF}}{{IF SVA_Value <= 50}}平衡{{END IF}}。
*   骨盆代偿机制：{{IF PT_Value > 20}}存在骨盆后旋代偿{{END IF}}{{IF PT_Value <= 20}}无明显代偿{{END IF}}。
{{IF SVA_Value > 50}}*   建议进一步评估神经肌肉功能及截骨矫形手术指征。{{END IF}}

---
报告生成时间：{{Generated_Time}}
系统：AI辅助测量分析
"""


def render_template(template: str, data: Mapping[str, Any]) -> str:
    """Render the existing conditional template syntax without side effects."""

    result = _process_conditions(template, data)
    result = _replace_variables(result, data)
    return _clean_empty_lines(result)


def _process_conditions(template: str, data: Mapping[str, Any]) -> str:
    pattern = r"\{\{IF\s+([^}]+)\}\}(.*?)(?:\{\{ELSE\s*IF\s+([^}]+)\}\}(.*?))*(?:\{\{ELSE\}\}(.*?))?\{\{END\s*IF\}\}"

    def replace_condition(match: re.Match[str]) -> str:
        condition = match.group(1).strip()
        if_content = match.group(2)
        else_content = match.group(5) if match.group(5) else ""
        return if_content if _evaluate_condition(condition, data) else else_content

    return re.sub(pattern, replace_condition, template, flags=re.DOTALL)


def _evaluate_condition(condition: str, data: Mapping[str, Any]) -> bool:
    for operator in ("<=", ">=", "==", "!=", "<", ">"):
        parts = condition.split(operator)
        if len(parts) != 2:
            continue
        left_value = data.get(parts[0].strip())
        right_value = parts[1].strip().strip("\"'")
        return _compare_values(left_value, right_value, operator)
    return bool(data.get(condition))


def _compare_values(left: Any, right: str, operator: str) -> bool:
    if left is None:
        return False
    try:
        left_value: float | str = float(left)
        right_value: float | str = float(right)
    except (TypeError, ValueError):
        left_value = str(left)
        right_value = right

    if operator == "==":
        return left_value == right_value
    if operator == "!=":
        return left_value != right_value
    if not isinstance(left_value, float) or not isinstance(right_value, float):
        return False
    if operator == "<":
        return left_value < right_value
    if operator == ">":
        return left_value > right_value
    if operator == "<=":
        return left_value <= right_value
    return left_value >= right_value


def _replace_variables(template: str, data: Mapping[str, Any]) -> str:
    def replace_variable(match: re.Match[str]) -> str:
        value = data.get(match.group(1).strip())
        return str(value) if value is not None else ""

    return re.sub(r"\{\{([^}]+)\}\}", replace_variable, template)


def _clean_empty_lines(text: str) -> str:
    return re.sub(r"\n\s*\n\s*\n+", "\n\n", text).strip()


def extract_measurement_data(
    measurements: Sequence[ReportMeasurement], exam_type: str
) -> dict[str, Any]:
    """Convert measurements into the variables expected by legacy templates."""

    measurement_dict: dict[str, dict[str, float | str]] = {}
    for measurement in measurements:
        value_string = measurement.value
        cleaned_value = re.sub(r"[°mm]+$", "", value_string).strip()
        try:
            numeric_value = float(cleaned_value)
        except ValueError:
            numeric_value = 0.0
        measurement_dict[measurement.type] = {
            "value": numeric_value,
            "value_str": value_string,
        }

    data: dict[str, Any] = {}
    if exam_type == AP_EXAM_TYPE:
        data["Cobb_Angle"] = measurement_dict.get("Cobb", {}).get("value", 0.0)
        data["Nash_Moe_Grade"] = measurement_dict.get("Nash-Moe", {}).get("value", 0)
        data["T1_Tilt"] = measurement_dict.get("T1 Tilt", {}).get("value", 0.0)
        data["CA_Value"] = measurement_dict.get("CA", {}).get("value", 0.0)
        data["Pelvic_Obliquity"] = measurement_dict.get("Pelvic", {}).get("value", 0.0)
        data["Trunk_Shift"] = measurement_dict.get("TS", {}).get("value", 0.0)
        data["C7_Shift"] = measurement_dict.get("C7 shift", {}).get("value", 0.0)
        data["AVT_Value"] = measurement_dict.get("AVT", {}).get("value", 0.0)

        cobb_angle = data["Cobb_Angle"]
        if cobb_angle < 10:
            data["Severity_Level"] = "正常"
        elif cobb_angle < 25:
            data["Severity_Level"] = "轻度侧弯"
        elif cobb_angle < 40:
            data["Severity_Level"] = "中度侧弯"
        else:
            data["Severity_Level"] = "重度侧弯"

        trunk_shift = data["Trunk_Shift"]
        data["Direction"] = "左" if trunk_shift < 0 else "右"
        data["Trunk_Shift"] = abs(trunk_shift)

        if cobb_angle >= 10:
            data["Summary_Text"] = f"{data['Severity_Level']}，Cobb角{cobb_angle:.1f}°"
            if trunk_shift > 10:
                data["Summary_Text"] += f"，伴躯干向{data['Direction']}偏移"
        else:
            data["Summary_Text"] = "脊柱形态基本正常"
    elif exam_type == LATERAL_EXAM_TYPE:
        data["SVA_Value"] = measurement_dict.get("SVA", {}).get("value", 0.0)
        data["CL_Value"] = measurement_dict.get("C2-C7 Cobb", {}).get("value", 0.0)
        data["TK_Value"] = measurement_dict.get("TK", {}).get("value", 0.0)
        data["LL_Value"] = measurement_dict.get("LL", {}).get("value", 0.0)
        data["PI_Value"] = measurement_dict.get("PI", {}).get("value", 0.0)
        data["PT_Value"] = measurement_dict.get("PT", {}).get("value", 0.0)
        data["SS_Value"] = measurement_dict.get("SS", {}).get("value", 0.0)
        data["TPA_Value"] = measurement_dict.get("TPA", {}).get("value", 0.0)
        data["PT_Plus_SS"] = data["PT_Value"] + data["SS_Value"]
        data["Gap"] = abs(data["PI_Value"] - data["PT_Plus_SS"])

    return data


def generate_report_text(
    *,
    exam_type: str,
    measurements: Sequence[ReportMeasurement],
    generated_time: str,
) -> str:
    """Generate report text using the existing exam-specific rules."""

    data = extract_measurement_data(measurements, exam_type)
    data["Generated_Time"] = generated_time
    if exam_type == AP_EXAM_TYPE:
        template = AP_REPORT_TEMPLATE
    elif exam_type == LATERAL_EXAM_TYPE:
        template = LATERAL_REPORT_TEMPLATE
    else:
        raise UnsupportedExamType(exam_type)
    return render_template(template, data)
