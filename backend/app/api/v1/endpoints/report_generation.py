"""
报告生成API端点

基于测量数据和模板生成分析报告

@author XieHe Medical System
@created 2026-01-12
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.logging import get_logger
from app.models.image import ImageAnnotation, Study
from app.models.patient import Patient
from app.services.template_service import TemplateService

logger = get_logger(__name__)

router = APIRouter()


# Pydantic模型
class MeasurementItem(BaseModel):
    type: str
    value: str
    description: Optional[str] = None


class GenerateReportRequest(BaseModel):
    imageId: str
    examType: str
    measurements: List[MeasurementItem]


class GenerateReportResponse(BaseModel):
    report: str
    generatedAt: str


# 正位X光片报告模板
FRONTAL_XRAY_TEMPLATE = """# 脊柱X光正位影像分析报告

## 【基本测量数据】
| 测量项目 | 测量值 | 参考/备注 |
| :--- | :--- | :--- |
| **Cobb角 (Main Curve)** | {{Cobb_Angle}}° | 主弯角度 |
| **椎体旋转 (Nash-Moe)** | {{Nash_Moe_Grade}}级 | 0级(正常)-IV级(严重) |
| **T1 倾斜角 (T1 Tilt)** | {{T1_Tilt}}° | 上胸椎/肩部平衡参考 |
| **两肩倾斜距离 (RSH)** | {{RSH_Value}} mm | >15mm提示外观不对称 |
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
    *   **肩部：** 两肩高度差 (RSH) 为 {{RSH_Value}} mm。{{IF RSH_Value > 15}} 存在肉眼可见的肩部不等高 (高低肩)。{{END IF}}
    *   **骨盆：** 骨盆倾斜角为 {{Pelvic_Obliquity}}°。{{IF Pelvic_Obliquity > 2}} 提示可能存在双下肢不等长或骨盆倾斜。{{END IF}}

## 【结论建议】
*   当前主要问题：{{Summary_Text}}。
*   建议结合临床体征（如剃刀背试验）综合评估。
{{IF Cobb_Angle > 20}}*   建议定期复查或咨询专科医生进行干预。{{END IF}}

---
报告生成时间：{{Generated_Time}}
系统：AI辅助测量分析
"""

# 侧位X光片报告模板
LATERAL_XRAY_TEMPLATE = """# 脊柱X光侧位影像分析报告

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


@router.post("/generate", response_model=GenerateReportResponse, summary="生成分析报告")
async def generate_report(
    request: GenerateReportRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    基于测量数据和模板生成分析报告
    """
    try:
        # 从measurements中提取数据
        data = TemplateService._extract_measurement_data(request.measurements, request.examType)
        
        # 添加生成时间
        data['Generated_Time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 选择模板
        if request.examType == '正位X光片':
            template = FRONTAL_XRAY_TEMPLATE
        elif request.examType == '侧位X光片':
            template = LATERAL_XRAY_TEMPLATE
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的影像类型: {request.examType}"
            )
        
        # 渲染报告
        report = TemplateService.render_template(template, data)
        
        logger.info(f"成功生成报告: {request.imageId}, 类型: {request.examType}")
        
        return GenerateReportResponse(
            report=report,
            generatedAt=data['Generated_Time']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成报告失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成报告失败: {str(e)}"
        )

