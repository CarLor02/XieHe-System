"""
配置文件
"""

from pathlib import Path

# 当前目录（6-app_backend）
CURRENT_DIR = Path(__file__).parent

# 模型路径（本地 weights 文件夹）
CORNER_MODEL_PATH = CURRENT_DIR / "weights" / "corner_model.pt"
CFH_MODEL_PATH = CURRENT_DIR / "weights" / "cfh_model.pt"

# 推理参数
CORNER_CONF_THRESHOLD = 0.2  # Corner模型置信度阈值
CFH_CONF_THRESHOLD = 0.1  # CFH模型置信度阈值
INFERENCE_IMAGE_SIZE = 1280
INFERENCE_IOU_THRESHOLD = 0.7
CORNER_MAX_DETECTIONS = 40
CFH_MAX_DETECTIONS = 5

# 服务器配置
HOST = "0.0.0.0"
PORT = 8000

# 椎体类别名称映射（必须与 Model1 最终 20 类侧位模型完全一致）
VERTEBRA_NAMES = {
    0: "C2",
    1: "C7",
    2: "T1",
    3: "T2",
    4: "T3",
    5: "T4",
    6: "T5",
    7: "T6",
    8: "T7",
    9: "T8",
    10: "T9",
    11: "T10",
    12: "T11",
    13: "T12",
    14: "T13",
    15: "L1",
    16: "L2",
    17: "L3",
    18: "L4",
    19: "L5",
}

PELVIS_NAMES = {0: "pelvis"}
PELVIS_KEYPOINT_NAMES = ("CFH", "S1_left", "S1_right")

# 反向映射
VERTEBRA_IDS = {v: k for k, v in VERTEBRA_NAMES.items()}
