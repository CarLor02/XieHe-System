"""
报告生成引擎

基于模板的报告自动生成引擎，支持AI诊断结果自动填充

@author XieHe Medical System
@created 2025-09-24
"""

import json
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from jinja2 import Template, Environment, BaseLoader

from app.models.report import ReportTemplate, DiagnosticReport, ReportStatusEnum, PriorityEnum
from app.core.logging import get_logger

logger = get_logger(__name__)

class ReportGenerator:
    """报告生成引擎"""
    
    def __init__(self):
        self.jinja_env = Environment(loader=BaseLoader())
        
    def generate_report_number(self, report_type: str, patient_id: int) -> str:
        """
        生成报告编号
        格式: YYYYMMDD-{TYPE}-{PATIENT_ID}-{SEQUENCE}
        """
        today = datetime.now().strftime("%Y%m%d")
        type_code = report_type.upper()[:3]
        sequence = datetime.now().strftime("%H%M%S")
        
        return f"{today}-{type_code}-{patient_id:06d}-{sequence}"
    
    def generate_from_template(
        self,
        template: ReportTemplate,
        patient_data: Dict[str, Any],
        study_data: Dict[str, Any],
        ai_results: Optional[Dict[str, Any]] = None,
        user_inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        基于模板生成报告
        
        Args:
            template: 报告模板
            patient_data: 患者数据
            study_data: 检查数据
            ai_results: AI诊断结果
            user_inputs: 用户输入数据
            
        Returns:
            生成的报告数据
        """
        try:
            logger.info(f"开始生成报告: 模板={getattr(template, 'template_name', 'Unknown')}, 患者={patient_data.get('name')}")

            # 准备数据上下文
            context = self._prepare_context(
                template, patient_data, study_data, ai_results, user_inputs
            )

            # 生成报告内容
            report_content = self._generate_content(template, context)

            # 生成报告编号
            report_type = getattr(template, 'report_type', 'RADIOLOGY')
            if hasattr(report_type, 'value'):
                report_type = report_type.value
            report_number = self.generate_report_number(
                report_type,
                patient_data.get('id')
            )

            # 构建报告数据
            report_data = {
                "report_number": report_number,
                "template_id": getattr(template, 'id', 0),
                "patient_id": patient_data.get('id'),
                "study_id": study_data.get('id'),
                "report_type": getattr(template, 'report_type', 'RADIOLOGY'),
                "report_title": self._generate_title(template, patient_data, study_data),
                "status": ReportStatusEnum.DRAFT,
                "priority": self._determine_priority(ai_results, study_data),
                **report_content,
                "structured_data": context.get('structured_data', {}),
                "ai_assisted": ai_results is not None,
                "ai_suggestions": ai_results,
                "examination_date": study_data.get('study_date'),
                "report_date": date.today(),
                "reporting_physician": context.get('reporting_physician', ''),
                "created_at": datetime.now()
            }
            
            logger.info(f"报告生成成功: {report_number}")
            return report_data
            
        except Exception as e:
            logger.error(f"报告生成失败: {e}")
            raise Exception(f"报告生成失败: {e}")
    
    def _prepare_context(
        self,
        template: ReportTemplate,
        patient_data: Dict[str, Any],
        study_data: Dict[str, Any],
        ai_results: Optional[Dict[str, Any]],
        user_inputs: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """准备模板渲染上下文"""
        
        context = {
            # 患者信息
            "patient": patient_data,
            "patient_name": patient_data.get('name', ''),
            "patient_age": patient_data.get('age', ''),
            "patient_gender": patient_data.get('gender', ''),
            "patient_id_number": patient_data.get('id_number', ''),
            
            # 检查信息
            "study": study_data,
            "study_date": study_data.get('study_date', ''),
            "modality": study_data.get('modality', ''),
            "body_part": study_data.get('body_part', ''),
            "study_description": study_data.get('description', ''),
            
            # 模板默认值
            "defaults": getattr(template, 'default_values', None) or {},
            
            # 用户输入
            "inputs": user_inputs or {},
            
            # AI结果
            "ai": ai_results or {},
            
            # 时间信息
            "current_date": datetime.now().strftime("%Y-%m-%d"),
            "current_time": datetime.now().strftime("%H:%M:%S"),
            "current_datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            
            # 其他信息
            "template_name": getattr(template, 'template_name', 'Unknown Template'),
            "template_version": getattr(template, 'version', '1.0'),
            "reporting_physician": study_data.get('referring_physician', ''),
        }
        
        # 合并AI结果到上下文
        if ai_results:
            context.update({
                "ai_diagnosis": ai_results.get('predicted_class', ''),
                "ai_confidence": ai_results.get('confidence', 0),
                "ai_suggestions": ai_results.get('suggestions', []),
                "ai_findings": ai_results.get('findings', [])
            })
        
        return context
    
    def _generate_content(
        self,
        template: ReportTemplate,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成报告内容"""
        
        content = {}
        template_content = getattr(template, 'template_content', {})
        
        if not template_content or 'sections' not in template_content:
            raise Exception("模板内容格式错误")
        
        sections = template_content['sections']
        structured_data = {}
        
        for section in sections:
            section_name = section.get('name', '')
            section_type = section.get('type', 'textarea')
            
            # 根据段落类型生成内容
            if section_type == 'textarea':
                content[section_name] = self._generate_textarea_content(section, context)
            elif section_type == 'select':
                content[section_name] = self._generate_select_content(section, context)
            elif section_type == 'checklist':
                content[section_name] = self._generate_checklist_content(section, context)
            elif section_type == 'structured':
                structured_content = self._generate_structured_content(section, context)
                content[section_name] = structured_content['text']
                structured_data[section_name] = structured_content['data']
        
        # 映射到标准报告字段
        report_content = {
            "clinical_history": content.get('临床病史', content.get('clinical_history', '')),
            "examination_technique": content.get('检查技术', content.get('examination_technique', '')),
            "findings": content.get('检查所见', content.get('findings', '')),
            "impression": content.get('诊断意见', content.get('impression', content.get('diagnosis', ''))),
            "recommendations": content.get('建议', content.get('recommendations', '')),
            "structured_data": structured_data
        }
        
        return report_content
    
    def _generate_textarea_content(
        self,
        section: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """生成文本区域内容"""
        
        section_name = section.get('name', '')
        
        # 检查用户输入
        if context.get('inputs', {}).get(section_name):
            return context['inputs'][section_name]
        
        # 检查默认值
        if context.get('defaults', {}).get(section_name):
            return context['defaults'][section_name]
        
        # 根据AI结果生成内容
        if section_name in ['检查所见', 'findings']:
            return self._generate_findings_from_ai(context)
        elif section_name in ['诊断意见', 'impression', 'diagnosis']:
            return self._generate_impression_from_ai(context)
        elif section_name in ['建议', 'recommendations']:
            return self._generate_recommendations_from_ai(context)
        
        return section.get('placeholder', '')
    
    def _generate_select_content(
        self,
        section: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """生成选择框内容"""
        
        section_name = section.get('name', '')
        options = section.get('options', [])
        
        # 检查用户输入
        if context.get('inputs', {}).get(section_name):
            return context['inputs'][section_name]
        
        # 检查默认值
        if context.get('defaults', {}).get(section_name):
            return context['defaults'][section_name]
        
        # 返回第一个选项作为默认值
        return options[0] if options else ''
    
    def _generate_checklist_content(
        self,
        section: Dict[str, Any],
        context: Dict[str, Any]
    ) -> List[str]:
        """生成检查列表内容"""
        
        section_name = section.get('name', '')
        options = section.get('options', [])
        
        # 检查用户输入
        if context.get('inputs', {}).get(section_name):
            return context['inputs'][section_name]
        
        # 检查默认值
        if context.get('defaults', {}).get(section_name):
            return context['defaults'][section_name]
        
        # 根据检查类型返回默认选项
        if section_name in ['检查序列', 'sequences']:
            modality = context.get('modality', '').upper()
            if modality == 'MR':
                return ['T1WI', 'T2WI']
            elif modality == 'CT':
                return ['平扫']
        
        return []
    
    def _generate_structured_content(
        self,
        section: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """生成结构化内容"""
        
        fields = section.get('fields', [])
        text_parts = []
        data_parts = {}
        
        for field in fields:
            field_name = field.get('name', '')
            field_type = field.get('type', 'textarea')
            
            if field_type == 'textarea':
                content = self._generate_textarea_content(field, context)
                if content:
                    text_parts.append(f"{field_name}: {content}")
                    data_parts[field_name] = content
        
        return {
            "text": "\n".join(text_parts),
            "data": data_parts
        }
    
    def _generate_findings_from_ai(self, context: Dict[str, Any]) -> str:
        """基于AI结果生成检查所见"""
        
        ai_results = context.get('ai', {})
        if not ai_results:
            return ""
        
        findings = []
        
        # AI检测结果
        if ai_results.get('findings'):
            for finding in ai_results['findings']:
                findings.append(finding.get('description', ''))
        
        # 如果没有具体发现，生成通用描述
        if not findings:
            modality = context.get('modality', '').upper()
            body_part = context.get('body_part', '')
            
            if modality == 'CT' and '胸部' in body_part:
                findings.append("双肺纹理清晰，未见明显实质性病变。")
                findings.append("纵隔居中，心影大小正常。")
                findings.append("胸膜腔未见积液。")
            elif modality == 'MR' and '头颅' in body_part:
                findings.append("脑实质信号正常，未见异常信号影。")
                findings.append("脑室系统大小、形态正常。")
                findings.append("中线结构居中。")
        
        return "\n".join(findings)
    
    def _generate_impression_from_ai(self, context: Dict[str, Any]) -> str:
        """基于AI结果生成诊断意见"""
        
        ai_results = context.get('ai', {})
        if not ai_results:
            return "未见明显异常。"
        
        predicted_class = ai_results.get('predicted_class', '')
        confidence = ai_results.get('confidence', 0)
        
        if predicted_class and predicted_class != '正常':
            confidence_text = ""
            if confidence > 0.9:
                confidence_text = "（高度可能）"
            elif confidence > 0.7:
                confidence_text = "（可能）"
            elif confidence > 0.5:
                confidence_text = "（考虑）"
            
            return f"{predicted_class}{confidence_text}。"
        
        return "未见明显异常。"
    
    def _generate_recommendations_from_ai(self, context: Dict[str, Any]) -> str:
        """基于AI结果生成建议"""
        
        ai_results = context.get('ai', {})
        if not ai_results:
            return ""
        
        suggestions = ai_results.get('suggestions', [])
        if suggestions:
            return "\n".join(suggestions)
        
        # 根据诊断结果生成建议
        predicted_class = ai_results.get('predicted_class', '')
        if predicted_class and predicted_class != '正常':
            return "建议结合临床，必要时进一步检查。"
        
        return ""
    
    def _generate_title(
        self,
        template: ReportTemplate,
        patient_data: Dict[str, Any],
        study_data: Dict[str, Any]
    ) -> str:
        """生成报告标题"""
        
        patient_name = patient_data.get('name', '')
        modality = study_data.get('modality', '')
        body_part = study_data.get('body_part', getattr(template, 'body_part', '') or '')
        
        return f"{patient_name} {body_part}{modality}检查报告"
    
    def _determine_priority(
        self,
        ai_results: Optional[Dict[str, Any]],
        study_data: Dict[str, Any]
    ) -> PriorityEnum:
        """确定报告优先级"""

        # 检查是否为急诊
        if study_data.get('is_emergency'):
            return PriorityEnum.URGENT

        # 根据AI结果确定优先级
        if ai_results:
            confidence = ai_results.get('confidence', 0)
            predicted_class = ai_results.get('predicted_class', '')

            # 高置信度异常结果
            if confidence > 0.8 and predicted_class not in ['正常', 'normal']:
                if any(keyword in predicted_class.lower() for keyword in ['癌', 'cancer', '恶性', 'malignant']):
                    return PriorityEnum.HIGH
                else:
                    return PriorityEnum.NORMAL

        return PriorityEnum.NORMAL

# 全局报告生成器实例
report_generator = ReportGenerator()
