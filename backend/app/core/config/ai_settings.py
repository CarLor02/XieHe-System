"""AI model and inference service configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class AiSettings(BaseAppSettings):
    """Settings for AI model service endpoints and local model paths."""

    AI_MODEL_SERVICE_URL: str = "http://localhost:8001"
    AI_MODEL_TIMEOUT: int = 30
    AI_MODEL_MAX_RETRIES: int = 3
    AI_AP_MEASUREMENT_OBJECT_URL: str = ""
    AI_LAT_MEASUREMENT_OBJECT_URL: str = ""
    AI_FRONT_KEYPOINTS_OBJECT_URL: str = ""
    AI_LATERAL_DETECT_OBJECT_URL: str = ""

    AI_MODELS_DIR: str = "./models"
    DEFAULT_MODEL_NAME: str = "medical_diagnosis_v1.0"


ai_settings = AiSettings()
