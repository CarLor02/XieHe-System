"""
模型推理服务
"""
import numpy as np
from ultralytics import YOLO
from typing import List, Optional

from lat.config import (
    CORNER_MODEL_PATH, 
    CFH_MODEL_PATH,
    CORNER_CONF_THRESHOLD,
    CFH_CONF_THRESHOLD,
    VERTEBRA_NAMES
)
from lat.domain.detection_models import (
    Point, 
    VertebraDetection, 
    CFHDetection, 
    DetectionResponse
)


class InferenceService:
    """推理服务类"""
    
    def __init__(self):
        """初始化模型"""
        print("🔧 初始化推理服务...")
        
        # 检查模型文件
        if not CORNER_MODEL_PATH.exists():
            raise FileNotFoundError(f"Corner模型不存在: {CORNER_MODEL_PATH}")
        if not CFH_MODEL_PATH.exists():
            raise FileNotFoundError(f"CFH模型不存在: {CFH_MODEL_PATH}")
        
        # 加载模型
        print(f"📦 加载Corner模型: {CORNER_MODEL_PATH}")
        self.corner_model = YOLO(str(CORNER_MODEL_PATH))
        
        print(f"📦 加载CFH模型: {CFH_MODEL_PATH}")
        self.cfh_model = YOLO(str(CFH_MODEL_PATH))
        
        print("✅ 推理服务初始化完成")
    
    def detect(self, image: np.ndarray) -> DetectionResponse:
        """
        对图像进行检测
        
        Args:
            image: 输入图像（BGR格式）
            
        Returns:
            DetectionResponse: 检测结果
        """
        h, w = image.shape[:2]
        
        # Corner检测
        vertebrae = self._detect_vertebrae(image, w, h)
        
        # CFH检测
        cfh = self._detect_cfh(image, w, h)
        
        return DetectionResponse(
            vertebrae=vertebrae,
            cfh=cfh,
            image_width=w,
            image_height=h
        )
    
    def _detect_vertebrae(self, image: np.ndarray, w: int, h: int) -> List[VertebraDetection]:
        """检测椎体"""
        results = self.corner_model(image, conf=CORNER_CONF_THRESHOLD, verbose=False)
        
        vertebrae = []
        for result in results:
            boxes = result.boxes
            keypoints = result.keypoints
            
            if boxes is None or keypoints is None:
                continue
            
            for i in range(len(boxes)):
                box = boxes[i]
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                
                if conf < CORNER_CONF_THRESHOLD:
                    continue
                
                # 获取边界框（归一化坐标）
                bbox_xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = bbox_xyxy
                cx = (x1 + x2) / 2 / w
                cy = (y1 + y2) / 2 / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h
                
                # 获取关键点（归一化坐标）
                kpts = keypoints[i].xy[0].cpu().numpy()
                kpts_list = [
                    Point(x=float(kpt[0] / w), y=float(kpt[1] / h))
                    for kpt in kpts
                ]
                
                vertebrae.append(VertebraDetection(
                    label=VERTEBRA_NAMES.get(cls, f'Class_{cls}'),
                    confidence=conf,
                    bbox=[cx, cy, bw, bh],
                    keypoints=kpts_list
                ))
        
        return vertebrae
    
    def _detect_cfh(self, image: np.ndarray, w: int, h: int) -> Optional[CFHDetection]:
        """检测股骨头"""
        results = self.cfh_model(image, conf=CFH_CONF_THRESHOLD, verbose=False)
        
        for result in results:
            boxes = result.boxes
            
            if boxes is None or len(boxes) == 0:
                continue
            
            # 取置信度最高的检测结果
            box = boxes[0]
            conf = float(box.conf[0])
            
            if conf < CFH_CONF_THRESHOLD:
                continue
            
            # 获取边界框（归一化坐标）
            bbox_xyxy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = bbox_xyxy
            cx = (x1 + x2) / 2 / w
            cy = (y1 + y2) / 2 / h
            bw = (x2 - x1) / w
            bh = (y2 - y1) / h
            
            return CFHDetection(
                confidence=conf,
                bbox=[cx, cy, bw, bh],
                center=Point(x=cx, y=cy)
            )
        
        return None


# 全局推理服务实例
_inference_service: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    """获取推理服务实例（单例模式）"""
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service
