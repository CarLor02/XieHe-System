"""
报告模板处理服务

处理报告模板的变量替换和条件逻辑

@author XieHe Medical System
@created 2026-01-12
"""

import re
from typing import Dict, Any, Optional, List


class TemplateService:
    """报告模板处理服务"""
    
    @staticmethod
    def render_template(template: str, data: Dict[str, Any]) -> str:
        """
        渲染报告模板
        
        Args:
            template: 模板字符串
            data: 数据字典
            
        Returns:
            渲染后的报告文本
        """
        # 处理条件逻辑
        result = TemplateService._process_conditions(template, data)
        
        # 替换变量
        result = TemplateService._replace_variables(result, data)
        
        # 清理多余的空行
        result = TemplateService._clean_empty_lines(result)
        
        return result
    
    @staticmethod
    def _process_conditions(template: str, data: Dict[str, Any]) -> str:
        """
        处理模板中的条件逻辑
        
        支持的语法:
        {{IF condition}} content {{END IF}}
        {{ELSE IF condition}} content {{END IF}}
        {{ELSE}} content {{END IF}}
        """
        # 处理 IF-ELSE 条件
        pattern = r'\{\{IF\s+([^}]+)\}\}(.*?)(?:\{\{ELSE\s*IF\s+([^}]+)\}\}(.*?))*(?:\{\{ELSE\}\}(.*?))?\{\{END\s*IF\}\}'
        
        def replace_condition(match):
            condition = match.group(1).strip()
            if_content = match.group(2)
            else_content = match.group(5) if match.group(5) else ""
            
            # 评估条件
            if TemplateService._evaluate_condition(condition, data):
                return if_content
            else:
                return else_content
        
        result = re.sub(pattern, replace_condition, template, flags=re.DOTALL)
        return result
    
    @staticmethod
    def _evaluate_condition(condition: str, data: Dict[str, Any]) -> bool:
        """
        评估条件表达式
        
        支持的操作符: <, >, <=, >=, ==, !=
        """
        # 解析条件表达式
        operators = ['<=', '>=', '==', '!=', '<', '>']
        
        for op in operators:
            if op in condition:
                parts = condition.split(op)
                if len(parts) == 2:
                    left = parts[0].strip()
                    right = parts[1].strip()
                    
                    # 获取左侧值
                    left_value = TemplateService._get_value(left, data)
                    
                    # 获取右侧值
                    try:
                        right_value = float(right)
                    except ValueError:
                        right_value = right.strip('"\'')
                    
                    # 执行比较
                    if left_value is None:
                        return False
                    
                    try:
                        left_num = float(left_value)
                        right_num = float(right_value) if isinstance(right_value, (int, float, str)) else right_value
                        
                        if op == '<':
                            return left_num < right_num
                        elif op == '>':
                            return left_num > right_num
                        elif op == '<=':
                            return left_num <= right_num
                        elif op == '>=':
                            return left_num >= right_num
                        elif op == '==':
                            return left_num == right_num
                        elif op == '!=':
                            return left_num != right_num
                    except (ValueError, TypeError):
                        # 字符串比较
                        if op == '==':
                            return str(left_value) == str(right_value)
                        elif op == '!=':
                            return str(left_value) != str(right_value)
                    
                    return False
        
        # 简单的布尔值检查
        value = TemplateService._get_value(condition, data)
        return bool(value)
    
    @staticmethod
    def _get_value(key: str, data: Dict[str, Any]) -> Any:
        """从数据字典中获取值"""
        if key in data:
            return data[key]
        return None
    
    @staticmethod
    def _replace_variables(template: str, data: Dict[str, Any]) -> str:
        """
        替换模板中的变量
        
        语法: {{variable_name}}
        """
        pattern = r'\{\{([^}]+)\}\}'
        
        def replace_var(match):
            var_name = match.group(1).strip()
            value = TemplateService._get_value(var_name, data)
            return str(value) if value is not None else ""
        
        result = re.sub(pattern, replace_var, template)
        return result
    
    @staticmethod
    def _clean_empty_lines(text: str) -> str:
        """清理多余的空行"""
        # 将连续的空行替换为单个空行
        result = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        return result.strip()

    @staticmethod
    def _extract_measurement_data(measurements: List[Any], exam_type: str) -> Dict[str, Any]:
        """
        从测量数据中提取报告所需的数据

        Args:
            measurements: 测量数据列表
            exam_type: 检查类型

        Returns:
            数据字典
        """
        data = {}

        # 将measurements转换为字典
        measurement_dict = {}
        for m in measurements:
            # 提取数值（去除单位）
            value_str = m.value if hasattr(m, 'value') else str(m.get('value', ''))
            # 去除单位符号
            value_clean = re.sub(r'[°mm]+$', '', value_str).strip()
            try:
                value_num = float(value_clean)
            except ValueError:
                value_num = 0.0

            measurement_type = m.type if hasattr(m, 'type') else m.get('type', '')
            measurement_dict[measurement_type] = {
                'value': value_num,
                'value_str': value_str
            }

        if exam_type == '正位X光片':
            # 提取正位X光片数据
            data['Cobb_Angle'] = measurement_dict.get('Cobb', {}).get('value', 0.0)
            data['Nash_Moe_Grade'] = measurement_dict.get('Nash-Moe', {}).get('value', 0)
            data['T1_Tilt'] = measurement_dict.get('T1 Tilt', {}).get('value', 0.0)
            data['CA_Value'] = measurement_dict.get('CA', {}).get('value', 0.0)
            data['Pelvic_Obliquity'] = measurement_dict.get('Pelvic', {}).get('value', 0.0)
            data['Trunk_Shift'] = measurement_dict.get('TS', {}).get('value', 0.0)
            data['C7_Shift'] = measurement_dict.get('C7 shift', {}).get('value', 0.0)
            data['AVT_Value'] = measurement_dict.get('AVT', {}).get('value', 0.0)

            # 计算严重程度
            cobb_angle = data['Cobb_Angle']
            if cobb_angle < 10:
                data['Severity_Level'] = '正常'
            elif cobb_angle < 25:
                data['Severity_Level'] = '轻度侧弯'
            elif cobb_angle < 40:
                data['Severity_Level'] = '中度侧弯'
            else:
                data['Severity_Level'] = '重度侧弯'

            # 确定偏移方向
            trunk_shift = data['Trunk_Shift']
            data['Direction'] = '左' if trunk_shift < 0 else '右'
            data['Trunk_Shift'] = abs(trunk_shift)  # 使用绝对值

            # 生成总结文本
            if cobb_angle >= 10:
                data['Summary_Text'] = f"{data['Severity_Level']}，Cobb角{cobb_angle:.1f}°"
                if trunk_shift > 10:
                    data['Summary_Text'] += f"，伴躯干向{data['Direction']}偏移"
            else:
                data['Summary_Text'] = '脊柱形态基本正常'

        elif exam_type == '侧位X光片':
            # 提取侧位X光片数据
            data['SVA_Value'] = measurement_dict.get('SVA', {}).get('value', 0.0)
            data['CL_Value'] = measurement_dict.get('C2-C7 Cobb', {}).get('value', 0.0)
            data['TK_Value'] = measurement_dict.get('TK', {}).get('value', 0.0)
            data['LL_Value'] = measurement_dict.get('LL', {}).get('value', 0.0)
            data['PI_Value'] = measurement_dict.get('PI', {}).get('value', 0.0)
            data['PT_Value'] = measurement_dict.get('PT', {}).get('value', 0.0)
            data['SS_Value'] = measurement_dict.get('SS', {}).get('value', 0.0)
            data['TPA_Value'] = measurement_dict.get('TPA', {}).get('value', 0.0)

            # 计算 PT + SS
            data['PT_Plus_SS'] = data['PT_Value'] + data['SS_Value']

            # 计算差值
            data['Gap'] = abs(data['PI_Value'] - data['PT_Plus_SS'])

        return data

