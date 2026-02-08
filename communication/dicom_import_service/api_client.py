"""
XieHe后端API客户端

负责调用XieHe系统的患者创建和影像上传API

作者: XieHe Medical System
创建时间: 2026-02-08
"""

import logging
import requests
from pathlib import Path
from typing import Optional, Dict, Any

from models import PatientInfo, PatientCreateRequest
from config import settings

logger = logging.getLogger(__name__)


class XieHeAPIClient:
    """XieHe后端API客户端"""
    
    def __init__(self, backend_url: str, api_token: str):
        """
        初始化API客户端
        
        Args:
            backend_url: 后端API基础URL
            api_token: API认证token
        """
        self.backend_url = backend_url.rstrip('/')
        self.api_token = api_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        })
    
    def check_patient_exists(self, patient_id: str) -> bool:
        """
        检查患者是否已存在
        
        Args:
            patient_id: 患者ID
            
        Returns:
            True表示存在，False表示不存在
        """
        try:
            url = f"{self.backend_url}/api/v1/patients"
            params = {'patient_id': patient_id, 'page': 1, 'page_size': 1}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            # 如果返回的患者列表不为空，说明患者存在
            return len(data.get('patients', [])) > 0
            
        except Exception as e:
            logger.error(f"检查患者是否存在失败: {patient_id}, 错误: {e}")
            return False
    
    def create_patient(self, patient_info: PatientInfo) -> Optional[Dict[str, Any]]:
        """
        创建患者
        
        Args:
            patient_info: 患者信息
            
        Returns:
            创建的患者数据，失败返回None
        """
        try:
            url = f"{self.backend_url}/api/v1/patients"
            
            # 构建请求数据
            data = {
                'patient_id': patient_info.patient_id,
                'name': patient_info.name,
                'gender': patient_info.gender,
                'birth_date': patient_info.birth_date.isoformat() if patient_info.birth_date else None
            }
            
            response = self.session.post(url, json=data)
            response.raise_for_status()
            
            patient_data = response.json()
            logger.info(f"创建患者成功: {patient_info.patient_id} - {patient_info.name}")
            return patient_data
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                # 患者可能已存在
                logger.warning(f"患者可能已存在: {patient_info.patient_id}")
                return None
            else:
                logger.error(f"创建患者失败: {patient_info.patient_id}, 错误: {e}")
                return None
        except Exception as e:
            logger.error(f"创建患者失败: {patient_info.patient_id}, 错误: {e}")
            return None
    
    def check_image_exists(self, patient_id: str, filename: str) -> bool:
        """
        检查影像是否已存在（基于患者ID + 文件名）
        
        Args:
            patient_id: 患者ID
            filename: 原始文件名
            
        Returns:
            True表示存在，False表示不存在
        """
        try:
            url = f"{self.backend_url}/api/v1/image-files"
            params = {'patient_id': patient_id, 'filename': filename}
            
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            # 如果返回的影像列表不为空，说明影像存在
            return len(data.get('files', [])) > 0
            
        except Exception as e:
            logger.error(f"检查影像是否存在失败: {patient_id}/{filename}, 错误: {e}")
            return False
    
    def upload_image(
        self,
        jpg_path: Path,
        patient_id: str,
        original_filename: str,
        description: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        上传影像文件
        
        Args:
            jpg_path: JPG文件路径
            patient_id: 患者ID
            original_filename: 原始DICOM文件名
            description: 影像描述
            
        Returns:
            上传的影像数据，失败返回None
        """
        try:
            url = f"{self.backend_url}/api/v1/upload/single"
            
            # 准备文件和表单数据
            files = {
                'file': (jpg_path.name, open(jpg_path, 'rb'), 'image/jpeg')
            }
            data = {
                'patient_id': patient_id,
                'description': description or f"从DICOM导入: {original_filename}"
            }
            
            # 上传时不使用JSON Content-Type
            headers = {'Authorization': f'Bearer {self.api_token}'}
            response = requests.post(url, files=files, data=data, headers=headers)
            response.raise_for_status()
            
            image_data = response.json()
            logger.info(f"上传影像成功: {patient_id}/{original_filename}")
            return image_data
            
        except Exception as e:
            logger.error(f"上传影像失败: {patient_id}/{original_filename}, 错误: {e}")
            return None

