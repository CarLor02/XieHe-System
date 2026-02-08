import json
import os
import uuid
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

# 定义数据模型
class ModelViewType(str, Enum):
    FRONT = "front"
    SIDE = "side"
    OTHER = "other"

class ModelStatus(str, Enum):
    TRAINING = "training"
    READY = "ready"
    DEPLOYED = "deployed"
    STOPPED = "stopped"
    ERROR = "error"

class AIModel(BaseModel):
    id: str
    name: str
    description: Optional[str]
    view_type: ModelViewType
    version: str = "1.0.0"
    status: ModelStatus = ModelStatus.READY
    endpoint_url: str
    is_active: bool = False
    accuracy: float = 0.0
    created_at: str
    updated_at: str
    creator: str
    tags: List[str] = []

    class Config:
        use_enum_values = True

class ModelConfiguration(BaseModel):
    front_model_id: Optional[str] = None
    side_model_id: Optional[str] = None

class ModelData(BaseModel):
    models: List[AIModel] = []
    configuration: ModelConfiguration = ModelConfiguration()

class ModelManager:
    def __init__(self, data_file: str = "data/models.json"):
        # Ensure path is absolute or relative to project root
        # __file__ is backend/app/services/model_manager.py
        # dirname -> services
        # dirname -> app
        # dirname -> backend
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.data_file = os.path.join(base_path, data_file)
        

        self._ensure_data_file()

    def _ensure_data_file(self):
        if not os.path.exists(self.data_file):

            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            self._save_data(ModelData())

    def _load_data(self) -> ModelData:
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return ModelData(**data)
        except Exception:
            return ModelData()

    def _save_data(self, data: ModelData):
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=2, ensure_ascii=False)

    def get_models(self) -> List[AIModel]:
        data = self._load_data()
        return data.models

    def get_model(self, model_id: str) -> Optional[AIModel]:
        data = self._load_data()
        for model in data.models:
            if model.id == model_id:
                return model
        return None

    async def check_model_health(self, endpoint_url: str) -> ModelStatus:
        """检查模型健康状态"""
        try:
            # 构建 health 接口 URL
            base_url = endpoint_url.rstrip('/predict').rstrip('/')
            health_url = f"{base_url}/health"

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_url)

                if response.status_code == 200:
                    data = response.json()
                    # 检查模型是否加载成功
                    if data.get("status") == "ok":
                        return ModelStatus.READY
                    else:
                        return ModelStatus.ERROR
                else:
                    return ModelStatus.ERROR
        except Exception as e:
            print(f"Health check failed for {endpoint_url}: {e}")
            return ModelStatus.STOPPED

    async def create_model(self, model_data: Dict[str, Any]) -> AIModel:
        data = self._load_data()

        # Determine view_type to ensure enum consistency
        view_type = model_data.get("view_type", ModelViewType.OTHER)

        # 检查模型健康状态
        endpoint_url = model_data.get("endpoint_url", "")
        status = await self.check_model_health(endpoint_url) if endpoint_url else ModelStatus.STOPPED

        new_model = AIModel(
            id=f"MODEL_{uuid.uuid4().hex[:8].upper()}",
            name=model_data.get("name", "未命名模型"),
            description=model_data.get("description"),
            view_type=view_type,
            version=model_data.get("version", "1.0.0"),
            status=status,
            endpoint_url=endpoint_url,
            is_active=False,
            accuracy=0.0,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            creator=model_data.get("creator", "User"),
            tags=model_data.get("tags", [])
        )

        data.models.append(new_model)
        self._save_data(data)
        return new_model

    async def refresh_model_status(self, model_id: str) -> Optional[AIModel]:
        """刷新模型状态"""
        model = self.get_model(model_id)
        if not model:
            return None

        # 检查健康状态
        new_status = await self.check_model_health(model.endpoint_url)

        # 更新状态
        data = self._load_data()
        for i, m in enumerate(data.models):
            if m.id == model_id:
                m.status = new_status
                m.updated_at = datetime.now().isoformat()
                data.models[i] = m
                self._save_data(data)
                return m
        return None

    def update_model(self, model_id: str, update_data: Dict[str, Any]) -> Optional[AIModel]:
        data = self._load_data()
        for i, model in enumerate(data.models):
            if model.id == model_id:
                # Update fields
                model_dict = model.dict()
                model_dict.update(update_data)
                model_dict["updated_at"] = datetime.now().isoformat()

                updated_model = AIModel(**model_dict)
                data.models[i] = updated_model
                self._save_data(data)
                return updated_model
        return None

    def is_default_model(self, model_id: str) -> bool:
        """检查是否为系统默认模型"""
        data = self._load_data()
        config = data.configuration
        return model_id in [config.front_model_id, config.side_model_id]

    def get_default_model_by_type(self, view_type: str) -> Optional[AIModel]:
        """获取指定类型的默认模型"""
        data = self._load_data()
        config = data.configuration

        if view_type == "front":
            default_id = config.front_model_id
        elif view_type == "side":
            default_id = config.side_model_id
        else:
            return None

        if not default_id:
            return None

        return self.get_model(default_id)

    def activate_model(self, model_id: str) -> Dict[str, Any]:
        """激活模型"""
        model = self.get_model(model_id)
        if not model:
            raise ValueError("模型不存在")

        data = self._load_data()

        # 将同类型的其他模型设为非激活
        for m in data.models:
            if m.view_type == model.view_type:
                m.is_active = False

        # 激活当前模型
        for m in data.models:
            if m.id == model_id:
                m.is_active = True
                break

        # 更新 configuration
        if model.view_type == ModelViewType.FRONT:
            data.configuration.front_model_id = model_id
        elif model.view_type == ModelViewType.SIDE:
            data.configuration.side_model_id = model_id

        self._save_data(data)
        return {"success": True, "model_id": model_id}

    def delete_model(self, model_id: str) -> Dict[str, Any]:
        """删除模型（增强版，带保护和回退逻辑）"""
        # 1. 检查是否为系统默认模型
        if self.is_default_model(model_id):
            raise ValueError("系统默认模型不能删除")

        # 2. 获取要删除的模型
        model = self.get_model(model_id)
        if not model:
            raise ValueError("模型不存在")

        # 3. 如果是激活模型，需要回退到默认模型
        fallback_to_default = False
        default_model_id = None

        if model.is_active:
            default_model = self.get_default_model_by_type(model.view_type)
            if default_model and default_model.id != model_id:
                # 激活默认模型
                self.activate_model(default_model.id)
                fallback_to_default = True
                default_model_id = default_model.id

        # 4. 删除模型
        data = self._load_data()
        initial_count = len(data.models)
        data.models = [m for m in data.models if m.id != model_id]

        if len(data.models) < initial_count:
            self._save_data(data)
            return {
                "success": True,
                "fallback_to_default": fallback_to_default,
                "default_model_id": default_model_id
            }

        return {"success": False, "message": "模型删除失败"}

    def get_configuration(self) -> ModelConfiguration:
        data = self._load_data()
        return data.configuration

    def update_configuration(self, config_update: Dict[str, str]) -> ModelConfiguration:
        data = self._load_data()
        
        if "front_model_id" in config_update:
            data.configuration.front_model_id = config_update["front_model_id"]
            # Update models is_active status
            for m in data.models:
                if m.view_type == ModelViewType.FRONT:
                    m.is_active = (m.id == data.configuration.front_model_id)

        if "side_model_id" in config_update:
            data.configuration.side_model_id = config_update["side_model_id"]
            # Update models is_active status
            for m in data.models:
                if m.view_type == ModelViewType.SIDE:
                    m.is_active = (m.id == data.configuration.side_model_id)
        
        self._save_data(data)
        return data.configuration

    async def test_model(self, model_id: str, files: List[tuple]) -> Dict[str, Any]:
        """
        Proxy request to external model service
        """
        model = self.get_model(model_id)
        if not model:
            raise ValueError("Model not found")
        
        if not model.endpoint_url:
            raise ValueError("Model endpoint not configured")

        # Mock implementation for demonstration if no real endpoint provided or strictly testing UI logic
        # In a real scenario, we would use httpx to forward the request
        # For now, if the user mentioned they have an API, we try to call it.
        # However, without the exact API spec, making a generic POST request with multipart/form-data
        
        try:
            async with httpx.AsyncClient() as client:
                # Forward files to the external service
                # Note: files argument structure from FastAPI UploadFile needs adapting
                # Here we assume files are passed as list of ('file', (filename, file_content, content_type))
                
                # Check if this is a 'mock' internal test loop for UI dev
                if "mock" in model.endpoint_url.lower():
                     # Return a dummy image (placeholder) if it's a mock url
                     return {
                         "success": True,
                         "result_image": "https://via.placeholder.com/512?text=Processed+Result"
                     }

                response = await client.post(
                    model.endpoint_url,
                    files=files,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception(f"External API error: {response.text}")
                
                # Assume external API returns JSON with image url or base64
                # Or if it returns raw image bytes, we need to handle that.
                # Let's assume it returns JSON with 'scan_id' or 'image_url' or similar
                
                # If content-type is image, convert to base64
                if "image" in response.headers.get("content-type", ""):
                     import base64
                     b64_img = base64.b64encode(response.content).decode('utf-8')
                     return {
                         "success": True, 
                         "result_image": f"data:{response.headers['content-type']};base64,{b64_img}"
                     }
                
                return response.json()
                
        except Exception as e:
            # Fallback for now to not break UI if endpoint is unreachable
            print(f"Model test failed: {e}")
            raise e
