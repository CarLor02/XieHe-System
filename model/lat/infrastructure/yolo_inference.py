"""
模型推理服务
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np
from ultralytics import YOLO

from lat.config import (
    CFH_CONF_THRESHOLD,
    CFH_MAX_DETECTIONS,
    CFH_MODEL_PATH,
    CORNER_CONF_THRESHOLD,
    CORNER_MAX_DETECTIONS,
    CORNER_MODEL_PATH,
    INFERENCE_IMAGE_SIZE,
    INFERENCE_IOU_THRESHOLD,
    PELVIS_NAMES,
    VERTEBRA_NAMES,
)
from lat.domain.detection_models import (
    CFHDetection,
    DetectionResponse,
    Point,
    VertebraDetection,
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
        self._validate_model_contract(
            self.corner_model,
            list(VERTEBRA_NAMES.values()),
            expected_keypoints=4,
            label="Corner",
        )

        print(f"📦 加载CFH模型: {CFH_MODEL_PATH}")
        self.cfh_model = YOLO(str(CFH_MODEL_PATH))
        self._validate_model_contract(
            self.cfh_model,
            list(PELVIS_NAMES.values()),
            expected_keypoints=3,
            label="CFH",
        )

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

        # pelvis检测：CFH中心 + S1上终板左右点
        cfh = self._detect_cfh(image, w, h)

        # 保持现有检测响应契约：S1仍作为两个关键点的特殊椎体结果下发。
        if cfh is not None:
            vertebrae.append(
                VertebraDetection(
                    label="S1",
                    confidence=cfh.confidence,
                    bbox=cfh.bbox,
                    keypoints=[cfh.s1_left, cfh.s1_right],
                )
            )

        return DetectionResponse(
            vertebrae=vertebrae, cfh=cfh, image_width=w, image_height=h
        )

    def _detect_vertebrae(
        self, image: np.ndarray, w: int, h: int
    ) -> list[VertebraDetection]:
        """检测椎体"""
        results = self.corner_model(
            image,
            conf=CORNER_CONF_THRESHOLD,
            iou=INFERENCE_IOU_THRESHOLD,
            imgsz=INFERENCE_IMAGE_SIZE,
            max_det=CORNER_MAX_DETECTIONS,
            verbose=False,
        )

        best_by_class: dict[int, VertebraDetection] = {}
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
                if cls not in VERTEBRA_NAMES:
                    raise ValueError(f"Corner模型返回未知类别ID: {cls}")

                # 获取边界框（归一化坐标）
                bbox_xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = bbox_xyxy
                cx = (x1 + x2) / 2 / w
                cy = (y1 + y2) / 2 / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h

                # 获取关键点（归一化坐标）
                kpts = keypoints[i].data[0].cpu().numpy()
                if len(kpts) != 4:
                    raise ValueError(
                        f"Corner模型应返回4个关键点，实际返回{len(kpts)}个"
                    )
                kpts_list = [
                    Point(x=float(kpt[0] / w), y=float(kpt[1] / h)) for kpt in kpts
                ]

                detection = VertebraDetection(
                    label=VERTEBRA_NAMES[cls],
                    confidence=conf,
                    bbox=[cx, cy, bw, bh],
                    keypoints=kpts_list,
                )
                current = best_by_class.get(cls)
                if current is None or detection.confidence > current.confidence:
                    best_by_class[cls] = detection

        return [best_by_class[cls] for cls in sorted(best_by_class)]

    def _detect_cfh(self, image: np.ndarray, w: int, h: int) -> CFHDetection | None:
        """检测股骨头"""
        results = self.cfh_model(
            image,
            conf=CFH_CONF_THRESHOLD,
            iou=INFERENCE_IOU_THRESHOLD,
            imgsz=INFERENCE_IMAGE_SIZE,
            max_det=CFH_MAX_DETECTIONS,
            verbose=False,
        )

        best_detection: CFHDetection | None = None
        for result in results:
            boxes = result.boxes
            keypoints = result.keypoints

            if boxes is None or keypoints is None or len(boxes) == 0:
                continue

            for i in range(len(boxes)):
                box = boxes[i]
                conf = float(box.conf[0])
                cls = int(box.cls[0])

                if conf < CFH_CONF_THRESHOLD:
                    continue
                if cls not in PELVIS_NAMES:
                    raise ValueError(f"CFH模型返回未知类别ID: {cls}")

                bbox_xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = bbox_xyxy
                cx = (x1 + x2) / 2 / w
                cy = (y1 + y2) / 2 / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h

                kpts = keypoints[i].data[0].cpu().numpy()
                if len(kpts) != 3:
                    raise ValueError(f"CFH模型应返回3个关键点，实际返回{len(kpts)}个")

                detection = CFHDetection(
                    confidence=conf,
                    bbox=[cx, cy, bw, bh],
                    center=Point(x=float(kpts[0][0] / w), y=float(kpts[0][1] / h)),
                    s1_left=Point(x=float(kpts[1][0] / w), y=float(kpts[1][1] / h)),
                    s1_right=Point(x=float(kpts[2][0] / w), y=float(kpts[2][1] / h)),
                )
                if (
                    best_detection is None
                    or detection.confidence > best_detection.confidence
                ):
                    best_detection = detection

        return best_detection

    @staticmethod
    def _model_names(model: Any) -> list[str]:
        names = model.names
        if isinstance(names, dict):
            return [str(names[index]) for index in range(len(names))]
        return [str(name) for name in names]

    @classmethod
    def _validate_model_contract(
        cls,
        model: Any,
        expected_names: Sequence[str],
        expected_keypoints: int,
        label: str,
    ) -> None:
        names = cls._model_names(model)
        keypoint_shape = list(model.model.yaml.get("kpt_shape", []))
        if (
            model.task != "pose"
            or names != list(expected_names)
            or keypoint_shape != [expected_keypoints, 3]
        ):
            raise ValueError(
                f"{label}模型契约不匹配: task={model.task}, "
                f"names={names}, kpt_shape={keypoint_shape}"
            )


# 全局推理服务实例
_inference_service: InferenceService | None = None


def get_inference_service() -> InferenceService:
    """获取推理服务实例（单例模式）"""
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service
