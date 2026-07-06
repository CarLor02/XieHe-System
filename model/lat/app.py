"""
FastAPI应用主文件
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import numpy as np
import cv2
from pydantic import BaseModel
from typing import Optional
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from config import HOST, PORT
from models import DetectionResponse, KeypointsRequest, KeypointsResponse, Point
from inference_service import get_inference_service
from keypoints_service import compute_keypoints
from measurement_pipeline import derive_measurements_from_detection


class ObjectImageRequest(BaseModel):
    bucket: str
    object_key: str
    image_id: Optional[str] = None


def fetch_object_image_bytes(bucket: str, object_key: str) -> bytes:
    storage_service_url = os.getenv("STORAGE_SERVICE_URL", "").rstrip("/")
    storage_service_token = os.getenv("STORAGE_SERVICE_TOKEN", "")
    timeout = float(os.getenv("STORAGE_SERVICE_TIMEOUT", "30"))

    if not storage_service_url or not storage_service_token:
        raise HTTPException(status_code=503, detail="Storage service is not configured")

    object_url = (
        f"{storage_service_url}/objects/"
        f"{quote(bucket, safe='')}/"
        f"{quote(object_key, safe='/')}"
    )
    request = Request(
        object_url,
        headers={"X-Storage-Service-Token": storage_service_token},
        method="GET",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read()
    except HTTPError as exc:
        raise HTTPException(status_code=exc.code, detail=f"Storage service error: {exc.reason}")
    except URLError as exc:
        raise HTTPException(status_code=502, detail=f"Storage service unavailable: {exc.reason}")


def decode_image(contents: bytes):
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="无法解析图像文件")
    return image


def detect_image(image):
    service = get_inference_service()
    return service.detect(image)


def detect_and_calculate_image(image, image_id: str = "lateral_spine"):
    h, w = image.shape[:2]
    detection_result = detect_image(image)
    return compute_keypoints(
        detection_result.vertebrae,
        detection_result.cfh,
        image_width=w,
        image_height=h,
        image_id=image_id,
    )


def measurement_image(image, image_id: str = "lateral_spine"):
    h, w = image.shape[:2]
    detection_result = detect_image(image)
    return derive_measurements_from_detection(
        detection_result.vertebrae,
        detection_result.cfh,
        image_width=w,
        image_height=h,
        image_id=image_id,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("=" * 80)
    print("🚀 启动脊柱分析后端服务")
    print("=" * 80)
    # 预加载模型
    get_inference_service()
    print("✅ 服务启动完成")
    print("=" * 80)
    yield
    # 关闭时
    print("👋 服务关闭")


# 创建FastAPI应用
app = FastAPI(
    title="脊柱分析后端服务",
    description="提供脊柱X光片的椎体检测、关键点计算和指标计算服务",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "脊柱分析后端服务",
        "version": "1.0.0",
        "endpoints": {
            "detect": "/api/detect - 椎体和股骨头检测",
            "keypoints": "/api/keypoints - 关键点计算",
            "health": "/health - 健康检查"
        }
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


@app.post("/api/detect", response_model=DetectionResponse)
async def detect_vertebrae(file: UploadFile = File(...)):
    """
    步骤1: 椎体和股骨头检测
    
    上传图像，返回检测结果（椎体角点和股骨头位置）
    """
    try:
        contents = await file.read()
        image = decode_image(contents)
        return detect_image(image)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"检测失败: {str(e)}")


@app.post("/api/detect_object", response_model=DetectionResponse)
async def detect_vertebrae_object(request: ObjectImageRequest):
    try:
        image = decode_image(fetch_object_image_bytes(request.bucket, request.object_key))
        return detect_image(image)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"检测失败: {str(e)}")


@app.post("/api/keypoints", response_model=KeypointsResponse)
async def calculate_keypoints(request: KeypointsRequest):
    """
    步骤2: 计算关键点

    根据检测结果，计算用于指标计算的关键点位置（像素坐标）
    """
    try:
        # 从请求中获取图像尺寸（应该在DetectionResponse中）
        # 这里假设request中包含image_width和image_height
        # 如果没有，需要修改KeypointsRequest模型

        # 计算关键点
        result = compute_keypoints(
            request.vertebrae,
            request.cfh,
            image_width=request.image_width,
            image_height=request.image_height
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关键点计算失败: {str(e)}")


@app.post("/api/detect_and_keypoints", response_model=KeypointsResponse)
async def detect_and_calculate_keypoints(file: UploadFile = File(...)):
    """
    组合接口: 检测 + 关键点计算

    一次性完成检测和关键点计算，返回关键点JSON（像素坐标）
    """
    try:
        contents = await file.read()
        image = decode_image(contents)
        return detect_and_calculate_image(image)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@app.post("/api/detect_and_keypoints_object", response_model=KeypointsResponse)
async def detect_and_calculate_keypoints_object(request: ObjectImageRequest):
    try:
        image = decode_image(fetch_object_image_bytes(request.bucket, request.object_key))
        return detect_and_calculate_image(image, request.image_id or "lateral_spine")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@app.post("/api/measurement")
async def measure_object(request: ObjectImageRequest):
    try:
        image = decode_image(fetch_object_image_bytes(request.bucket, request.object_key))
        return measurement_image(image, request.image_id or "lateral_spine")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@app.post("/api/calculate_metrics")
async def calculate_metrics(keypoints_data: KeypointsResponse):
    """
    步骤3: 根据关键点JSON计算指标

    输入: 关键点JSON（步骤2的输出）
    输出: 指标JSON
    """
    try:
        # 解析measurements，按指标类型计算
        metrics = {}

        # 构建一个字典来快速查找各指标的点
        measurements_dict = {}
        for m in keypoints_data.measurements:
            measurements_dict[m.type] = m.points

        # 计算各指标
        # 1. T1 Slope
        if "T1 Slope" in measurements_dict:
            points = measurements_dict["T1 Slope"]
            if len(points) >= 2:
                metrics["T1_Slope"] = _calculate_angle_with_horizontal(points[0], points[1])

        # 2. C2-C7 CL：椎体检测模型不识别 C2，无法由 AI 计算（保留前端手工标注）。

        # 3. TK T2-T5 (Thoracic Kyphosis T2-T5)
        if "TK T2-T5" in measurements_dict:
            points = measurements_dict["TK T2-T5"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Thoracic_Kyphosis_T2_T5"] = abs(angle1 - angle2)

        # 4. TK T5-T12 (Thoracic Kyphosis T5-T12)
        if "TK T5-T12" in measurements_dict:
            points = measurements_dict["TK T5-T12"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Thoracic_Kyphosis_T5_T12"] = abs(angle1 - angle2)

        # 4b. T10-L2 胸腰段后凸角 (Thoracolumbar Kyphosis)
        if "T10-L2" in measurements_dict:
            points = measurements_dict["T10-L2"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Thoracolumbar_Kyphosis_T10_L2"] = abs(angle1 - angle2)

        # 5. LL L1-S1 (Lumbar Lordosis)
        if "LL L1-S1" in measurements_dict:
            points = measurements_dict["LL L1-S1"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Lumbar_Lordosis"] = abs(angle1 - angle2)

        # 5b. LL L1-L4 (新增)
        if "LL L1-L4" in measurements_dict:
            points = measurements_dict["LL L1-L4"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Lumbar_Lordosis_L1_L4"] = abs(angle1 - angle2)

        # 5c. LL L4-S1 (新增)
        if "LL L4-S1" in measurements_dict:
            points = measurements_dict["LL L4-S1"]
            if len(points) >= 4:
                angle1 = _calculate_angle_with_horizontal(points[0], points[1])
                angle2 = _calculate_angle_with_horizontal(points[2], points[3])
                metrics["Lumbar_Lordosis_L4_S1"] = abs(angle1 - angle2)

        # 6. SVA
        if "SVA" in measurements_dict:
            points = measurements_dict["SVA"]
            if len(points) >= 2:
                metrics["SVA"] = abs(points[0].x - points[1].x)

        # 7. TPA (7个点: T1四个角点 + CFH + S1左 + S1右)
        if "TPA" in measurements_dict:
            points = measurements_dict["TPA"]
            if len(points) >= 7:
                # T1中心：前4个点的中心
                t1_center_x = (points[0].x + points[1].x + points[2].x + points[3].x) / 4
                t1_center_y = (points[0].y + points[1].y + points[2].y + points[3].y) / 4
                t1_center = Point(x=t1_center_x, y=t1_center_y)

                # CFH中心：第5个点
                cfh_center = points[4]

                # S1中心：第6、7个点的中点
                s1_center_x = (points[5].x + points[6].x) / 2
                s1_center_y = (points[5].y + points[6].y) / 2
                s1_center = Point(x=s1_center_x, y=s1_center_y)

                # 计算三点角度（以CFH为顶点）
                metrics["TPA"] = _calculate_three_point_angle(t1_center, cfh_center, s1_center)

        # 8. PI (3个点: CFH + S1左 + S1右)
        if "PI" in measurements_dict:
            points = measurements_dict["PI"]
            if len(points) >= 3:
                # CFH中心：第1个点
                cfh_center = points[0]

                # S1中心：第2、3个点的中点
                s1_center_x = (points[1].x + points[2].x) / 2
                s1_center_y = (points[1].y + points[2].y) / 2
                s1_center = Point(x=s1_center_x, y=s1_center_y)

                # S1上终板的角度（用于计算垂线）
                s1_angle = _calculate_angle_with_horizontal(points[1], points[2])

                # CFH到S1中心的连线角度
                import math
                dx = s1_center.x - cfh_center.x
                dy = s1_center.y - cfh_center.y
                cfh_s1_angle = math.degrees(math.atan2(dy, dx))

                # PI = S1垂线与CFH-S1连线的夹角
                # S1垂线角度 = S1终板角度 + 90度
                s1_perpendicular_angle = s1_angle + 90
                metrics["PI"] = abs(s1_perpendicular_angle - cfh_s1_angle)

        # 9. PT (3个点: CFH + S1左 + S1右)
        if "PT" in measurements_dict:
            points = measurements_dict["PT"]
            if len(points) >= 3:
                # CFH中心：第1个点
                cfh_center = points[0]

                # S1中心：第2、3个点的中点
                s1_center_x = (points[1].x + points[2].x) / 2
                s1_center_y = (points[1].y + points[2].y) / 2
                s1_center = Point(x=s1_center_x, y=s1_center_y)

                # CFH到S1中心的连线与垂直线的夹角
                import math
                dx = s1_center.x - cfh_center.x
                dy = s1_center.y - cfh_center.y
                cfh_s1_angle = math.degrees(math.atan2(dx, dy))

                # PT = CFH-S1连线与垂直线（90度）的夹角
                metrics["PT"] = abs(90 - cfh_s1_angle)

        # 10. SS
        if "SS" in measurements_dict:
            points = measurements_dict["SS"]
            if len(points) >= 2:
                metrics["SS"] = _calculate_angle_with_horizontal(points[0], points[1])

        return {
            "imageId": keypoints_data.imageId,
            "metrics": metrics
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"指标计算失败: {str(e)}")


def _calculate_angle_with_horizontal(p1: Point, p2: Point) -> float:
    """计算两点连线与水平线的夹角"""
    import math
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    angle_rad = math.atan2(abs(dy), abs(dx))
    return math.degrees(angle_rad)


def _calculate_three_point_angle(p1: Point, p2: Point, p3: Point) -> float:
    """计算三点形成的角度（p2为顶点）"""
    import math
    import numpy as np

    v1 = np.array([p1.x - p2.x, p1.y - p2.y])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y])

    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-10)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    angle_rad = np.arccos(cos_angle)
    return math.degrees(angle_rad)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
