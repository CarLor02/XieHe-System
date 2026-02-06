#!/usr/bin/env python3
"""
Spine Analysis API Server

提供脊柱 X 光片分析的 REST API 服务，包含：
- Pose: 躯干标志点检测 (6个关键点)
- Pose Corner: 椎骨角点检测 (每个椎骨4个角点)

启动服务:
    python app.py

    # 或使用 uvicorn (支持热重载)
    uvicorn app:app --reload --host 0.0.0.0 --port 8000

API 接口:
    POST /predict
    - 上传图片，返回前端交互系统需要的 annotations 格式 JSON

    GET /health
    - 健康检查
"""

import sys
import math
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import cv2
from ultralytics import YOLO

# ==================== 配置 ====================
POSE_MODEL_PATH = "weights/pose.pt"
POSE_CORNER_MODEL_PATH = "weights/pose_corner.pt"
CONF_THRESHOLD = 0.5

# ==================== 数据模型 ====================
class PointXY(BaseModel):
    x: float
    y: float

class Measurement(BaseModel):
    type: str
    points: List[PointXY]

class AnnotationsResponse(BaseModel):
    """前端交互系统需要的格式"""
    imageId: str
    imageWidth: int
    imageHeight: int
    measurements: List[Measurement]

# ==================== 初始化 ====================
app = FastAPI(
    title="Spine Analysis API",
    description="脊柱 X 光片分析服务：躯干标志点 + 椎骨角点检测",
    version="1.0.0"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型变量
pose_model = None
pose_corner_model = None

# ==================== 模型加载 ====================
def load_models():
    """加载模型（延迟加载）"""
    global pose_model, pose_corner_model
    
    if pose_model is None and Path(POSE_MODEL_PATH).exists():
        print(f"Loading Pose model: {POSE_MODEL_PATH}")
        pose_model = YOLO(POSE_MODEL_PATH)
    
    if pose_corner_model is None and Path(POSE_CORNER_MODEL_PATH).exists():
        print(f"Loading Pose Corner model: {POSE_CORNER_MODEL_PATH}")
        pose_corner_model = YOLO(POSE_CORNER_MODEL_PATH)

@app.on_event("startup")
async def startup_event():
    """服务启动时加载模型"""
    load_models()
    print("✅ Server started!")

# ==================== 推理函数 ====================
def infer_pose(img: np.ndarray) -> Dict[str, dict]:
    """
    Pose 模型推理 - 6个躯干标志点
    返回: {keypoint_name: {x, y, confidence}}
    """
    if pose_model is None:
        return {}

    # 获取原始图像尺寸
    orig_h, orig_w = img.shape[:2]

    results = pose_model.predict(img, verbose=False)
    result = results[0]

    keypoint_names = ['CR', 'CL', 'IR', 'IL', 'SR', 'SL']
    pose_data = {}

    if result.keypoints is not None and len(result.keypoints) > 0:
        # 获取原始关键点坐标（可能是基于模型输入尺寸的）
        keypoints = result.keypoints.xy.cpu().numpy()
        confidences = result.keypoints.conf.cpu().numpy() if result.keypoints.conf is not None else None
        box_confs = result.boxes.conf.cpu().numpy()

        # 使用归一化坐标来计算正确的像素坐标
        # keypoints.xyn 是归一化坐标 (0-1)，我们直接用它乘以原始图像尺寸
        keypoints_xyn = result.keypoints.xyn.cpu().numpy() if hasattr(result.keypoints, 'xyn') and result.keypoints.xyn is not None else None

        # 取置信度最高的检测结果
        best_idx = 0
        best_conf = 0
        for obj_idx in range(len(keypoints)):
            if box_confs[obj_idx] > best_conf and box_confs[obj_idx] >= CONF_THRESHOLD:
                best_conf = box_confs[obj_idx]
                best_idx = obj_idx

        if best_conf >= CONF_THRESHOLD and keypoints_xyn is not None:
            for kpt_idx in range(min(6, len(keypoints[best_idx]))):
                # 使用归一化坐标计算像素坐标
                x_norm, y_norm = keypoints_xyn[best_idx][kpt_idx]
                x = x_norm * orig_w
                y = y_norm * orig_h
                conf = confidences[best_idx][kpt_idx] if confidences is not None else 1.0

                pose_data[keypoint_names[kpt_idx]] = {
                    "x": float(x),
                    "y": float(y),
                    "confidence": float(conf)
                }

    return pose_data

def cls_id_to_vertebra_name(cls_id: int) -> str:
    """
    将class_id转换为椎骨名称
    0: C7
    1-12: T1-T12
    13-17: L1-L5
    """
    if cls_id == 0:
        return "C7"
    elif 1 <= cls_id <= 12:
        return f"T{cls_id}"
    elif 13 <= cls_id <= 17:
        return f"L{cls_id - 12}"
    else:
        return f"V{cls_id}"


def infer_pose_corner(img: np.ndarray) -> Dict[str, dict]:
    """
    Pose Corner 模型推理 - 椎骨4角点
    返回: {vertebra_name: {corners: {top_left, top_right, bottom_right, bottom_left}, class_id: int}}
    """
    if pose_corner_model is None:
        return {}

    results = pose_corner_model.predict(img, verbose=False)
    result = results[0]

    corner_keys = ["top_left", "top_right", "bottom_right", "bottom_left"]
    vertebrae = {}

    if result.keypoints is not None and len(result.keypoints) > 0:
        keypoints = result.keypoints.data.cpu().numpy()
        boxes = result.boxes

        for i, kpts in enumerate(keypoints):
            conf = float(boxes.conf[i])
            if conf < CONF_THRESHOLD:
                continue

            cls_id = int(boxes.cls[i])
            vertebra_name = cls_id_to_vertebra_name(cls_id)

            corners = {}
            for j, (x, y, v) in enumerate(kpts):
                corners[corner_keys[j]] = {"x": float(x), "y": float(y), "conf": float(v)}

            # 计算中点和中心
            tl, tr = corners["top_left"], corners["top_right"]
            bl, br = corners["bottom_left"], corners["bottom_right"]

            corners["top_mid"] = {"x": (tl["x"] + tr["x"]) / 2, "y": (tl["y"] + tr["y"]) / 2}
            corners["bottom_mid"] = {"x": (bl["x"] + br["x"]) / 2, "y": (bl["y"] + br["y"]) / 2}
            corners["center"] = {
                "x": (tl["x"] + tr["x"] + bl["x"] + br["x"]) / 4,
                "y": (tl["y"] + tr["y"] + bl["y"] + br["y"]) / 4
            }

            vertebrae[vertebra_name] = {"corners": corners, "confidence": conf, "class_id": cls_id}

    return vertebrae


# ==================== 转换为前端格式 ====================
def calc_angle(p1: dict, p2: dict) -> float:
    """计算两点连线与水平线的夹角（度）"""
    dx = p2["x"] - p1["x"]
    dy = p2["y"] - p1["y"]
    return math.degrees(math.atan2(dy, dx))


def calc_tilt_angle(left_point: dict, right_point: dict) -> float:
    """
    计算倾斜角（带正负）
    左边高为正，右边高为负

    参数:
        left_point: 左侧点 (x, y)
        right_point: 右侧点 (x, y)

    返回:
        倾斜角（度），左边高为正，右边高为负
    """
    # 计算角度
    angle = calc_angle(left_point, right_point)

    # 在图像坐标系中（y轴向下）：
    # 如果左边点的y值小于右边点（左边高），dy > 0，angle > 0，应该返回正值
    # 如果右边点的y值小于左边点（右边高），dy < 0，angle < 0，应该返回负值

    # 但是 atan2 返回的角度范围是 -180° 到 +180°
    # 我们需要的是小角度范围，所以直接使用 angle 即可
    # 如果 angle 接近 ±180°，需要调整到 ±0° 附近

    if angle > 90:
        angle = angle - 180
    elif angle < -90:
        angle = angle + 180

    return angle


def calc_cobb_angle(upper_left: dict, upper_right: dict, lower_left: dict, lower_right: dict) -> float:
    """
    计算Cobb角
    上端椎使用下边缘，下端椎使用上边缘
    返回角度，左凸为正（脊柱向左侧弯），右凸为负（脊柱向右侧弯）
    """
    # 上端椎下边缘的倾斜角
    upper_angle = calc_angle(upper_left, upper_right)
    # 下端椎上边缘的倾斜角
    lower_angle = calc_angle(lower_left, lower_right)

    # Cobb角 = 两条线的夹角
    cobb_magnitude = abs(upper_angle - lower_angle)

    # 判断正负：基于上端椎和下端椎的倾斜方向
    # 左凸（向左侧弯）：上端椎右边高（upper_angle > 0），下端椎左边高（lower_angle < 0）
    # 右凸（向右侧弯）：上端椎左边高（upper_angle < 0），下端椎右边高（lower_angle > 0）

    # 简化判断：如果上端椎倾斜角 > 下端椎倾斜角，说明是左凸
    if upper_angle > lower_angle:
        return cobb_magnitude  # 左凸为正
    else:
        return -cobb_magnitude  # 右凸为负


def find_cobb_angles(vertebrae_data: Dict[str, dict]) -> List[Dict]:
    """
    自动查找最多3个Cobb角：
    1. 胸弯 (T2-T11/T12)
    2. 胸腰弯 (T2-L1)
    3. 腰弯 (L1/L2-L4)

    只返回绝对值大于10度的Cobb角
    """
    cobb_angles = []

    # 定义三个区域的椎骨范围
    regions = [
        {"name": "Thoracic", "range": ["T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]},
        {"name": "Thoracolumbar", "range": ["T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12", "L1"]},
        {"name": "Lumbar", "range": ["L1", "L2", "L3", "L4"]}
    ]

    for region in regions:
        # 筛选出该区域内存在的椎骨
        available_vertebrae = {name: data for name, data in vertebrae_data.items() if name in region["range"]}

        if len(available_vertebrae) < 2:
            continue

        # 步骤1: 找到顶椎（离中线最远的椎骨）
        # 先计算所有椎骨的中心x坐标的平均值作为中线
        center_x_values = [data["corners"]["center"]["x"] for data in available_vertebrae.values()]
        midline_x = sum(center_x_values) / len(center_x_values)

        max_offset = 0
        apex_vertebra = None
        apex_name = None
        apex_y = None
        apex_tilt = None

        for name, data in available_vertebrae.items():
            center = data["corners"]["center"]
            offset = abs(center["x"] - midline_x)
            if offset > max_offset:
                max_offset = offset
                apex_vertebra = data["corners"]
                apex_name = name
                apex_y = center["y"]
                apex_tilt = calc_angle(data["corners"]["top_left"], data["corners"]["top_right"])

        if apex_vertebra is None:
            continue

        # 步骤2: 在顶椎上方找倾斜角最大的椎骨作为上端椎（如果没有，顶椎就是上端椎）
        max_tilt = apex_tilt
        upper_vertebra = apex_vertebra
        upper_name = apex_name

        for name, data in available_vertebrae.items():
            center_y = data["corners"]["center"]["y"]
            # 只考虑在顶椎上方的椎骨（y坐标更小）
            if center_y < apex_y - 10:  # 至少相差10像素
                corners = data["corners"]
                tilt = calc_angle(corners["top_left"], corners["top_right"])
                if tilt > max_tilt:
                    max_tilt = tilt
                    upper_vertebra = corners
                    upper_name = name

        # 步骤3: 在顶椎下方找倾斜角最小的椎骨作为下端椎（如果没有，顶椎就是下端椎）
        min_tilt = apex_tilt
        lower_vertebra = apex_vertebra
        lower_name = apex_name

        for name, data in available_vertebrae.items():
            center_y = data["corners"]["center"]["y"]
            # 只考虑在顶椎下方的椎骨（y坐标更大）
            if center_y > apex_y + 10:  # 至少相差10像素
                corners = data["corners"]
                tilt = calc_angle(corners["top_left"], corners["top_right"])
                if tilt < min_tilt:
                    min_tilt = tilt
                    lower_vertebra = corners
                    lower_name = name

        # 必须有上端椎和下端椎，且不能是同一个椎骨
        if upper_vertebra and lower_vertebra and upper_name != lower_name:
            # 上端椎使用下边缘，下端椎使用上边缘
            cobb = calc_cobb_angle(
                upper_vertebra["bottom_left"],
                upper_vertebra["bottom_right"],
                lower_vertebra["top_left"],
                lower_vertebra["top_right"]
            )

            # 只保留绝对值大于10度的（临床标准）
            if abs(cobb) > 10:
                cobb_angles.append({
                    "type": f"Cobb-{region['name']}",
                    "angle": cobb,
                    "upper_vertebra": upper_name,
                    "lower_vertebra": lower_name,
                    "apex_vertebra": apex_name,
                    "points": [
                        {"x": upper_vertebra["bottom_left"]["x"], "y": upper_vertebra["bottom_left"]["y"]},
                        {"x": upper_vertebra["bottom_right"]["x"], "y": upper_vertebra["bottom_right"]["y"]},
                        {"x": lower_vertebra["top_left"]["x"], "y": lower_vertebra["top_left"]["y"]},
                        {"x": lower_vertebra["top_right"]["x"], "y": lower_vertebra["top_right"]["y"]}
                    ]
                })

    return cobb_angles


def convert_to_annotations(
    pose_data: Dict[str, dict],
    vertebrae_data: Dict[str, dict],
    image_id: str,
    image_width: int,
    image_height: int
) -> dict:
    """
    将模型输出转换为前端交互系统需要的 annotations 格式
    """
    measurements = []

    # 1. T1 Tilt - T1上终板左右端点
    if "T1" in vertebrae_data:
        t1 = vertebrae_data["T1"]["corners"]
        measurements.append({
            "type": "T1 Tilt",
            "points": [
                {"x": t1["top_left"]["x"], "y": t1["top_left"]["y"]},
                {"x": t1["top_right"]["x"], "y": t1["top_right"]["y"]}
            ]
        })

    # 2. Cobb角 - 自动查找最多3个Cobb角（胸弯、胸腰弯、腰弯）
    if vertebrae_data:
        cobb_angles = find_cobb_angles(vertebrae_data)
        for cobb_data in cobb_angles:
            measurements.append({
                "type": cobb_data["type"],
                "points": cobb_data["points"],
                "angle": cobb_data["angle"],
                "upper_vertebra": cobb_data["upper_vertebra"],
                "lower_vertebra": cobb_data["lower_vertebra"],
                "apex_vertebra": cobb_data["apex_vertebra"]
            })

    # 3. CA (两肩倾斜角) - CR, CL
    if "CR" in pose_data and "CL" in pose_data:
        # CR是右侧（图像左侧），CL是左侧（图像右侧）
        # 注意：在医学影像中，左右是相对于患者的，所以CR在图像右侧，CL在图像左侧
        # 但根据标注，我们需要确认哪个是左哪个是右
        ca_angle = calc_tilt_angle(pose_data["CR"], pose_data["CL"])
        measurements.append({
            "type": "CA",
            "angle": ca_angle,
            "points": [
                {"x": pose_data["CR"]["x"], "y": pose_data["CR"]["y"]},
                {"x": pose_data["CL"]["x"], "y": pose_data["CL"]["y"]}
            ]
        })

    # 4. Pelvic (骨盆倾斜角) - IR, IL
    if "IR" in pose_data and "IL" in pose_data:
        # IR是右侧髂骨，IL是左侧髂骨
        # calc_tilt_angle的参数顺序是(left_point, right_point)
        pelvic_angle = calc_tilt_angle(pose_data["IL"], pose_data["IR"])
        measurements.append({
            "type": "Pelvic",
            "angle": pelvic_angle,
            "points": [
                {"x": pose_data["IR"]["x"], "y": pose_data["IR"]["y"]},
                {"x": pose_data["IL"]["x"], "y": pose_data["IL"]["y"]}
            ]
        })

    # 5. Sacral (骶骨倾斜角) - SR, SL
    if "SR" in pose_data and "SL" in pose_data:
        # SR是右侧骶骨，SL是左侧骶骨
        # calc_tilt_angle的参数顺序是(left_point, right_point)
        sacral_angle = calc_tilt_angle(pose_data["SL"], pose_data["SR"])
        measurements.append({
            "type": "Sacral",
            "angle": sacral_angle,
            "points": [
                {"x": pose_data["SR"]["x"], "y": pose_data["SR"]["y"]},
                {"x": pose_data["SL"]["x"], "y": pose_data["SL"]["y"]}
            ]
        })

    # 计算 CSVL (骶一中点的x坐标)
    csvl_x = None
    if "SR" in pose_data and "SL" in pose_data:
        csvl_x = (pose_data["SR"]["x"] + pose_data["SL"]["x"]) / 2

    # 6. AVT (顶椎偏移) - 顶椎中心 和 CSVL上对应点
    if vertebrae_data and csvl_x is not None:
        max_offset = 0
        apex_center = None
        for name, data in vertebrae_data.items():
            center = data["corners"]["center"]
            offset = abs(center["x"] - csvl_x)
            if offset > max_offset:
                max_offset = offset
                apex_center = center

        if apex_center:
            measurements.append({
                "type": "AVT",
                "points": [
                    {"x": apex_center["x"], "y": apex_center["y"]},
                    {"x": csvl_x, "y": apex_center["y"]}
                ]
            })

    # 7. TS (躯干偏移/C7偏移) - C7中心 和 CSVL上对应点
    if "C7" in vertebrae_data and csvl_x is not None:
        c7_center = vertebrae_data["C7"]["corners"]["center"]
        measurements.append({
            "type": "TS",
            "points": [
                {"x": c7_center["x"], "y": c7_center["y"]},
                {"x": csvl_x, "y": c7_center["y"]}
            ]
        })

    return {
        "imageId": image_id,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "measurements": measurements
    }


# ==================== API 路由 ====================
@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "pose_model": pose_model is not None,
        "pose_corner_model": pose_corner_model is not None
    }


@app.post("/predict", response_model=AnnotationsResponse)
async def predict(
    file: UploadFile = File(...),
    image_id: Optional[str] = Query(None, description="图片ID，默认使用文件名")
):
    """
    上传图片进行推理

    返回前端交互系统需要的 annotations 格式 JSON，包含:
    - T1 Tilt: T1倾斜角的两个端点
    - Cobb-Thoracic: 胸弯Cobb角（T2-T11/T12，上端椎下边缘+下端椎上边缘，4个点）
    - Cobb-Thoracolumbar: 胸腰弯Cobb角（T2-L1，上端椎下边缘+下端椎上边缘，4个点）
    - Cobb-Lumbar: 腰弯Cobb角（L1/L2-L4，上端椎下边缘+下端椎上边缘，4个点）
    - CA: 两肩倾斜角的两个点
    - Pelvic: 骨盆倾斜角的两个点
    - Sacral: 骶骨倾斜角的两个点
    - AVT: 顶椎偏移的两个点
    - TS: C7躯干偏移的两个点

    注：Cobb角只返回绝对值>10度的，左边高为正，右边高为负
    """
    # 检查文件类型
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 读取图片
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")

    # 生成 image_id
    if image_id is None:
        # 从文件名生成，去掉扩展名
        image_id = Path(file.filename).stem if file.filename else "IMG001"

    # 获取图片尺寸
    image_height, image_width = img.shape[:2]

    # 推理
    pose_data = infer_pose(img)
    vertebrae_data = infer_pose_corner(img)

    # 转换为前端格式
    result = convert_to_annotations(pose_data, vertebrae_data, image_id, image_width, image_height)

    return result


@app.post("/detect_keypoints")
async def detect_keypoints(
    file: UploadFile = File(...),
    image_id: Optional[str] = Query(None, description="图片ID，默认使用文件名")
):
    """
    检测所有关键点（原始数据）

    返回所有检测到的点的坐标，包括：
    - pose_keypoints: 躯干关键点 (CR, CL, IR, IL, SR, SL)
    - vertebrae: 椎骨角点 (C7, T1-T12, L1-L5)

    每个椎骨包含：
    - 4个角点: top_left, top_right, bottom_left, bottom_right
    - 计算点: top_mid, bottom_mid, center
    - 置信度: confidence
    """
    # 检查文件类型
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 读取图片
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")

    # 生成 image_id
    if image_id is None:
        image_id = Path(file.filename).stem if file.filename else "IMG001"

    # 获取图片尺寸
    image_height, image_width = img.shape[:2]

    # 推理
    pose_data = infer_pose(img)
    vertebrae_data = infer_pose_corner(img)

    # 返回原始检测数据
    return {
        "imageId": image_id,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "pose_keypoints": pose_data,
        "vertebrae": vertebrae_data
    }


# ==================== 主入口 ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

