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

    def create_model(self, model_data: Dict[str, Any]) -> AIModel:
        data = self._load_data()
        
        # Determine view_type to ensure enum consistency
        view_type = model_data.get("view_type", ModelViewType.OTHER)
        
        new_model = AIModel(
            id=f"MODEL_{uuid.uuid4().hex[:8].upper()}",
            name=model_data.get("name", "未命名模型"),
            description=model_data.get("description"),
            view_type=view_type,
            version=model_data.get("version", "1.0.0"),
            status=ModelStatus.READY,
            endpoint_url=model_data.get("endpoint_url", ""),
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

    def delete_model(self, model_id: str) -> bool:
        data = self._load_data()
        initial_count = len(data.models)
        data.models = [m for m in data.models if m.id != model_id]
        
        if len(data.models) < initial_count:
            # Check if it was active
            if data.configuration.front_model_id == model_id:
                data.configuration.front_model_id = None
            if data.configuration.side_model_id == model_id:
                data.configuration.side_model_id = None
            
            self._save_data(data)
            return True
        return False

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
