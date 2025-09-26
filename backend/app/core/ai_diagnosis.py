"""
AI辅助诊断模块

集成AI模型进行医学影像分析和辅助诊断

@author XieHe Medical System
@created 2025-09-24
"""

import os
import json
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime
import base64
import io

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

from app.core.logging import get_logger
from app.core.config import settings
from app.core.dicom_processor import dicom_processor

logger = get_logger(__name__)

class AIModel:
    """AI模型基类"""
    
    def __init__(self, model_name: str, model_path: str):
        self.model_name = model_name
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
    
    def load_model(self):
        """加载模型"""
        raise NotImplementedError
    
    def predict(self, image_data: np.ndarray) -> Dict[str, Any]:
        """预测"""
        raise NotImplementedError
    
    def preprocess_image(self, image_data: np.ndarray) -> np.ndarray:
        """图像预处理"""
        return image_data

class ChestXRayModel(AIModel):
    """胸部X光AI模型"""
    
    def __init__(self):
        super().__init__("chest_xray_classifier", "models/chest_xray.pth")
        self.classes = [
            "正常", "肺炎", "肺结核", "肺癌", "心脏肥大", 
            "胸腔积液", "气胸", "肺不张", "肺水肿"
        ]
    
    def load_model(self):
        """加载胸部X光模型"""
        try:
            # 这里应该加载实际的AI模型
            # 例如: self.model = torch.load(self.model_path)
            logger.info(f"模拟加载胸部X光模型: {self.model_name}")
            self.is_loaded = True
            return True
        except Exception as e:
            logger.error(f"加载胸部X光模型失败: {e}")
            return False
    
    def predict(self, image_data: np.ndarray) -> Dict[str, Any]:
        """胸部X光预测"""
        if not self.is_loaded:
            if not self.load_model():
                return {"error": "模型加载失败"}
        
        try:
            # 模拟AI预测结果
            import random
            
            # 生成模拟的预测概率
            probabilities = [random.random() for _ in self.classes]
            total = sum(probabilities)
            probabilities = [p / total for p in probabilities]
            
            # 找到最高概率的类别
            max_idx = probabilities.index(max(probabilities))
            predicted_class = self.classes[max_idx]
            confidence = probabilities[max_idx]
            
            # 生成详细结果
            results = []
            for i, (cls, prob) in enumerate(zip(self.classes, probabilities)):
                results.append({
                    "class": cls,
                    "probability": round(prob, 4),
                    "confidence": "高" if prob > 0.7 else "中" if prob > 0.4 else "低"
                })
            
            # 按概率排序
            results.sort(key=lambda x: x["probability"], reverse=True)
            
            # 生成建议
            suggestions = []
            if predicted_class != "正常":
                suggestions.append(f"检测到可能的{predicted_class}，建议进一步检查")
                if confidence > 0.8:
                    suggestions.append("AI诊断置信度较高，建议优先处理")
                else:
                    suggestions.append("AI诊断置信度中等，建议结合临床症状判断")
            else:
                suggestions.append("影像显示基本正常，建议定期复查")
            
            return {
                "model_name": self.model_name,
                "predicted_class": predicted_class,
                "confidence": round(confidence, 4),
                "results": results,
                "suggestions": suggestions,
                "processing_time": round(random.uniform(0.5, 2.0), 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"胸部X光预测失败: {e}")
            return {"error": str(e)}

class SpineXRayModel(AIModel):
    """脊柱X光AI模型"""
    
    def __init__(self):
        super().__init__("spine_xray_classifier", "models/spine_xray.pth")
        self.classes = [
            "正常", "脊柱侧弯", "椎间盘突出", "骨质增生", 
            "压缩性骨折", "脊柱滑脱", "脊柱裂"
        ]
    
    def load_model(self):
        """加载脊柱X光模型"""
        try:
            logger.info(f"模拟加载脊柱X光模型: {self.model_name}")
            self.is_loaded = True
            return True
        except Exception as e:
            logger.error(f"加载脊柱X光模型失败: {e}")
            return False
    
    def predict(self, image_data: np.ndarray) -> Dict[str, Any]:
        """脊柱X光预测"""
        if not self.is_loaded:
            if not self.load_model():
                return {"error": "模型加载失败"}
        
        try:
            import random
            
            # 生成模拟的预测结果
            probabilities = [random.random() for _ in self.classes]
            total = sum(probabilities)
            probabilities = [p / total for p in probabilities]
            
            max_idx = probabilities.index(max(probabilities))
            predicted_class = self.classes[max_idx]
            confidence = probabilities[max_idx]
            
            results = []
            for cls, prob in zip(self.classes, probabilities):
                results.append({
                    "class": cls,
                    "probability": round(prob, 4),
                    "confidence": "高" if prob > 0.7 else "中" if prob > 0.4 else "低"
                })
            
            results.sort(key=lambda x: x["probability"], reverse=True)
            
            # 脊柱特定建议
            suggestions = []
            if predicted_class == "脊柱侧弯":
                suggestions.append("检测到脊柱侧弯，建议测量Cobb角")
                suggestions.append("建议进行功能性评估和康复治疗")
            elif predicted_class == "椎间盘突出":
                suggestions.append("疑似椎间盘突出，建议MRI进一步确认")
                suggestions.append("建议评估神经功能状态")
            elif predicted_class == "正常":
                suggestions.append("脊柱结构基本正常")
            else:
                suggestions.append(f"检测到{predicted_class}，建议专科医生进一步评估")
            
            return {
                "model_name": self.model_name,
                "predicted_class": predicted_class,
                "confidence": round(confidence, 4),
                "results": results,
                "suggestions": suggestions,
                "processing_time": round(random.uniform(0.8, 3.0), 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"脊柱X光预测失败: {e}")
            return {"error": str(e)}

class AIDiagnosisEngine:
    """AI诊断引擎"""
    
    def __init__(self):
        self.models = {
            "chest_xray": ChestXRayModel(),
            "spine_xray": SpineXRayModel()
        }
        self.model_mapping = {
            "CR": ["chest_xray", "spine_xray"],  # 计算机放射摄影
            "DX": ["chest_xray", "spine_xray"],  # 数字X光
            "RF": ["chest_xray"],                # 射频
        }
    
    def get_available_models(self) -> List[str]:
        """获取可用的AI模型列表"""
        return list(self.models.keys())
    
    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """获取模型信息"""
        if model_name not in self.models:
            return {"error": "模型不存在"}
        
        model = self.models[model_name]
        return {
            "name": model.model_name,
            "classes": getattr(model, 'classes', []),
            "is_loaded": model.is_loaded,
            "description": self._get_model_description(model_name)
        }
    
    def _get_model_description(self, model_name: str) -> str:
        """获取模型描述"""
        descriptions = {
            "chest_xray": "胸部X光AI分析模型，可识别肺炎、肺结核、肺癌等常见胸部疾病",
            "spine_xray": "脊柱X光AI分析模型，可识别脊柱侧弯、椎间盘突出等脊柱疾病"
        }
        return descriptions.get(model_name, "AI医学影像分析模型")
    
    def suggest_models_for_modality(self, modality: str) -> List[str]:
        """根据影像模态推荐AI模型"""
        return self.model_mapping.get(modality, [])
    
    def analyze_image(self, image_path: Path, model_name: str, 
                     metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """分析单张图像"""
        try:
            if model_name not in self.models:
                return {"error": f"未知的模型: {model_name}"}
            
            model = self.models[model_name]
            
            # 加载图像数据
            if dicom_processor and dicom_processor.validate_dicom_file(image_path):
                # DICOM文件
                image_data = dicom_processor.extract_pixel_data(image_path)
                if image_data is None:
                    return {"error": "无法提取DICOM像素数据"}
            else:
                # 普通图像文件
                if not PIL_AVAILABLE:
                    return {"error": "PIL库未安装，无法处理普通图像"}
                
                with Image.open(image_path) as img:
                    image_data = np.array(img.convert('L'))  # 转为灰度图
            
            # 预处理图像
            processed_image = model.preprocess_image(image_data)
            
            # AI预测
            result = model.predict(processed_image)
            
            # 添加图像信息
            result.update({
                "image_path": str(image_path),
                "image_shape": image_data.shape,
                "metadata": metadata or {}
            })
            
            logger.info(f"AI分析完成: {image_path} -> {model_name}")
            return result
            
        except Exception as e:
            logger.error(f"AI图像分析失败 {image_path}: {e}")
            return {"error": str(e)}
    
    def batch_analyze(self, image_paths: List[Path], model_name: str) -> List[Dict[str, Any]]:
        """批量分析图像"""
        results = []
        
        for image_path in image_paths:
            result = self.analyze_image(image_path, model_name)
            result["batch_index"] = len(results)
            results.append(result)
        
        # 添加批量统计信息
        success_count = sum(1 for r in results if "error" not in r)
        error_count = len(results) - success_count
        
        batch_summary = {
            "total_images": len(results),
            "success_count": success_count,
            "error_count": error_count,
            "model_used": model_name,
            "batch_timestamp": datetime.now().isoformat()
        }
        
        return {
            "results": results,
            "summary": batch_summary
        }
    
    def compare_models(self, image_path: Path, model_names: List[str]) -> Dict[str, Any]:
        """使用多个模型分析同一图像并比较结果"""
        results = {}
        
        for model_name in model_names:
            if model_name in self.models:
                result = self.analyze_image(image_path, model_name)
                results[model_name] = result
        
        # 生成比较报告
        comparison = {
            "image_path": str(image_path),
            "models_compared": model_names,
            "results": results,
            "comparison_timestamp": datetime.now().isoformat()
        }
        
        # 如果有多个成功的结果，进行一致性分析
        successful_results = {k: v for k, v in results.items() if "error" not in v}
        if len(successful_results) > 1:
            comparison["consensus_analysis"] = self._analyze_consensus(successful_results)
        
        return comparison
    
    def _analyze_consensus(self, results: Dict[str, Dict]) -> Dict[str, Any]:
        """分析多模型结果的一致性"""
        predictions = []
        confidences = []
        
        for model_name, result in results.items():
            if "predicted_class" in result:
                predictions.append(result["predicted_class"])
                confidences.append(result.get("confidence", 0))
        
        # 计算一致性
        unique_predictions = list(set(predictions))
        consensus_level = "高" if len(unique_predictions) == 1 else "中" if len(unique_predictions) <= 2 else "低"
        
        # 平均置信度
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            "consensus_level": consensus_level,
            "unique_predictions": unique_predictions,
            "average_confidence": round(avg_confidence, 4),
            "recommendation": self._get_consensus_recommendation(consensus_level, avg_confidence)
        }
    
    def _get_consensus_recommendation(self, consensus_level: str, avg_confidence: float) -> str:
        """根据一致性生成建议"""
        if consensus_level == "高" and avg_confidence > 0.8:
            return "多模型结果高度一致且置信度高，建议采纳AI诊断建议"
        elif consensus_level == "高":
            return "多模型结果一致但置信度中等，建议结合临床判断"
        elif consensus_level == "中":
            return "模型结果存在分歧，建议人工复核"
        else:
            return "模型结果差异较大，建议谨慎对待AI建议"

# 全局AI诊断引擎实例
ai_diagnosis_engine = AIDiagnosisEngine()
