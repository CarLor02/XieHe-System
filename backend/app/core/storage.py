"""
文件存储策略模块

实现本地存储和云存储策略，配置文件路径管理和访问控制

@author XieHe Medical System
@created 2025-09-24
"""

import os
import shutil
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Union, BinaryIO
from pathlib import Path
from datetime import datetime, timedelta
import hashlib
import mimetypes

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class StorageBackend(ABC):
    """存储后端抽象基类"""
    
    @abstractmethod
    def save(self, file_path: str, content: Union[bytes, BinaryIO], metadata: Optional[Dict] = None) -> bool:
        """保存文件"""
        pass
    
    @abstractmethod
    def load(self, file_path: str) -> Optional[bytes]:
        """加载文件"""
        pass
    
    @abstractmethod
    def delete(self, file_path: str) -> bool:
        """删除文件"""
        pass
    
    @abstractmethod
    def exists(self, file_path: str) -> bool:
        """检查文件是否存在"""
        pass
    
    @abstractmethod
    def get_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """获取文件访问URL"""
        pass
    
    @abstractmethod
    def list_files(self, prefix: str = "", limit: int = 100) -> List[Dict]:
        """列出文件"""
        pass

class LocalStorageBackend(StorageBackend):
    """本地存储后端"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # 创建子目录结构
        self.directories = {
            'dicom': self.base_path / 'dicom',
            'images': self.base_path / 'images', 
            'thumbnails': self.base_path / 'thumbnails',
            'reports': self.base_path / 'reports',
            'temp': self.base_path / 'temp',
            'archive': self.base_path / 'archive'
        }
        
        for directory in self.directories.values():
            directory.mkdir(parents=True, exist_ok=True)
    
    def _get_full_path(self, file_path: str) -> Path:
        """获取完整文件路径"""
        return self.base_path / file_path.lstrip('/')
    
    def save(self, file_path: str, content: Union[bytes, BinaryIO], metadata: Optional[Dict] = None) -> bool:
        """保存文件到本地存储"""
        try:
            full_path = self._get_full_path(file_path)
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            if isinstance(content, bytes):
                with open(full_path, 'wb') as f:
                    f.write(content)
            else:
                with open(full_path, 'wb') as f:
                    shutil.copyfileobj(content, f)
            
            # 保存元数据
            if metadata:
                metadata_path = full_path.with_suffix(full_path.suffix + '.meta')
                import json
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info(f"文件保存成功: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"文件保存失败 {file_path}: {e}")
            return False
    
    def load(self, file_path: str) -> Optional[bytes]:
        """从本地存储加载文件"""
        try:
            full_path = self._get_full_path(file_path)
            if not full_path.exists():
                return None
            
            with open(full_path, 'rb') as f:
                return f.read()
                
        except Exception as e:
            logger.error(f"文件加载失败 {file_path}: {e}")
            return None
    
    def delete(self, file_path: str) -> bool:
        """删除本地文件"""
        try:
            full_path = self._get_full_path(file_path)
            if full_path.exists():
                full_path.unlink()
                
                # 删除元数据文件
                metadata_path = full_path.with_suffix(full_path.suffix + '.meta')
                if metadata_path.exists():
                    metadata_path.unlink()
                
                logger.info(f"文件删除成功: {file_path}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"文件删除失败 {file_path}: {e}")
            return False
    
    def exists(self, file_path: str) -> bool:
        """检查本地文件是否存在"""
        full_path = self._get_full_path(file_path)
        return full_path.exists()
    
    def get_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """获取本地文件访问URL"""
        # 本地存储返回相对路径，由Web服务器处理
        return f"/api/v1/files/{file_path}"
    
    def list_files(self, prefix: str = "", limit: int = 100) -> List[Dict]:
        """列出本地文件"""
        try:
            prefix_path = self.base_path / prefix.lstrip('/')
            files = []
            
            if prefix_path.is_dir():
                for file_path in prefix_path.rglob('*'):
                    if file_path.is_file() and not file_path.name.endswith('.meta'):
                        relative_path = file_path.relative_to(self.base_path)
                        stat = file_path.stat()
                        
                        files.append({
                            'path': str(relative_path),
                            'size': stat.st_size,
                            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'mime_type': mimetypes.guess_type(str(file_path))[0]
                        })
                        
                        if len(files) >= limit:
                            break
            
            return files
            
        except Exception as e:
            logger.error(f"列出文件失败 {prefix}: {e}")
            return []

class CloudStorageBackend(StorageBackend):
    """云存储后端（示例实现）"""
    
    def __init__(self, config: Dict):
        self.config = config
        # 这里可以初始化云存储客户端（如AWS S3, 阿里云OSS等）
        logger.info("云存储后端初始化（示例实现）")
    
    def save(self, file_path: str, content: Union[bytes, BinaryIO], metadata: Optional[Dict] = None) -> bool:
        """保存文件到云存储"""
        # 云存储实现示例
        logger.info(f"云存储保存文件: {file_path}")
        return True
    
    def load(self, file_path: str) -> Optional[bytes]:
        """从云存储加载文件"""
        logger.info(f"云存储加载文件: {file_path}")
        return None
    
    def delete(self, file_path: str) -> bool:
        """删除云存储文件"""
        logger.info(f"云存储删除文件: {file_path}")
        return True
    
    def exists(self, file_path: str) -> bool:
        """检查云存储文件是否存在"""
        return False
    
    def get_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """获取云存储文件访问URL"""
        return f"https://cloud-storage.example.com/{file_path}"
    
    def list_files(self, prefix: str = "", limit: int = 100) -> List[Dict]:
        """列出云存储文件"""
        return []

class StorageManager:
    """存储管理器"""
    
    def __init__(self):
        self.backends: Dict[str, StorageBackend] = {}
        self.default_backend = 'local'
        
        # 初始化本地存储
        local_path = getattr(settings, 'STORAGE_LOCAL_PATH', './storage')
        self.backends['local'] = LocalStorageBackend(local_path)
        
        # 初始化云存储（如果配置了）
        cloud_config = getattr(settings, 'STORAGE_CLOUD_CONFIG', None)
        if cloud_config:
            self.backends['cloud'] = CloudStorageBackend(cloud_config)
    
    def get_backend(self, backend_name: Optional[str] = None) -> StorageBackend:
        """获取存储后端"""
        backend_name = backend_name or self.default_backend
        if backend_name not in self.backends:
            raise ValueError(f"未知的存储后端: {backend_name}")
        return self.backends[backend_name]
    
    def generate_file_path(self, filename: str, category: str = 'general', 
                          patient_id: Optional[str] = None) -> str:
        """生成文件存储路径"""
        # 按日期分目录
        date_path = datetime.now().strftime('%Y/%m/%d')
        
        # 生成唯一文件名
        timestamp = datetime.now().strftime('%H%M%S')
        name, ext = os.path.splitext(filename)
        safe_name = self._sanitize_filename(name)
        unique_filename = f"{safe_name}_{timestamp}{ext}"
        
        # 构建完整路径
        if patient_id:
            return f"{category}/patients/{patient_id}/{date_path}/{unique_filename}"
        else:
            return f"{category}/{date_path}/{unique_filename}"
    
    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名，移除不安全字符"""
        import re
        # 移除或替换不安全字符
        safe_name = re.sub(r'[^\w\-_.]', '_', filename)
        # 限制长度
        return safe_name[:100]
    
    def save_file(self, content: Union[bytes, BinaryIO], filename: str, 
                  category: str = 'general', patient_id: Optional[str] = None,
                  backend: Optional[str] = None, metadata: Optional[Dict] = None) -> Optional[str]:
        """保存文件"""
        try:
            file_path = self.generate_file_path(filename, category, patient_id)
            storage_backend = self.get_backend(backend)
            
            # 添加默认元数据
            if metadata is None:
                metadata = {}
            
            metadata.update({
                'original_filename': filename,
                'category': category,
                'patient_id': patient_id,
                'uploaded_at': datetime.now().isoformat(),
                'backend': backend or self.default_backend
            })
            
            if storage_backend.save(file_path, content, metadata):
                logger.info(f"文件保存成功: {file_path}")
                return file_path
            else:
                logger.error(f"文件保存失败: {filename}")
                return None
                
        except Exception as e:
            logger.error(f"保存文件异常 {filename}: {e}")
            return None
    
    def load_file(self, file_path: str, backend: Optional[str] = None) -> Optional[bytes]:
        """加载文件"""
        try:
            storage_backend = self.get_backend(backend)
            return storage_backend.load(file_path)
        except Exception as e:
            logger.error(f"加载文件异常 {file_path}: {e}")
            return None
    
    def delete_file(self, file_path: str, backend: Optional[str] = None) -> bool:
        """删除文件"""
        try:
            storage_backend = self.get_backend(backend)
            return storage_backend.delete(file_path)
        except Exception as e:
            logger.error(f"删除文件异常 {file_path}: {e}")
            return False
    
    def file_exists(self, file_path: str, backend: Optional[str] = None) -> bool:
        """检查文件是否存在"""
        try:
            storage_backend = self.get_backend(backend)
            return storage_backend.exists(file_path)
        except Exception as e:
            logger.error(f"检查文件存在异常 {file_path}: {e}")
            return False
    
    def get_file_url(self, file_path: str, expires_in: Optional[int] = None,
                     backend: Optional[str] = None) -> str:
        """获取文件访问URL"""
        try:
            storage_backend = self.get_backend(backend)
            return storage_backend.get_url(file_path, expires_in)
        except Exception as e:
            logger.error(f"获取文件URL异常 {file_path}: {e}")
            return ""
    
    def list_files(self, prefix: str = "", limit: int = 100, 
                   backend: Optional[str] = None) -> List[Dict]:
        """列出文件"""
        try:
            storage_backend = self.get_backend(backend)
            return storage_backend.list_files(prefix, limit)
        except Exception as e:
            logger.error(f"列出文件异常 {prefix}: {e}")
            return []
    
    def cleanup_temp_files(self, older_than_hours: int = 24) -> int:
        """清理临时文件"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
            temp_files = self.list_files("temp/")
            cleaned_count = 0
            
            for file_info in temp_files:
                file_time = datetime.fromisoformat(file_info['modified'])
                if file_time < cutoff_time:
                    if self.delete_file(file_info['path']):
                        cleaned_count += 1
            
            logger.info(f"清理临时文件完成: {cleaned_count} 个文件")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"清理临时文件异常: {e}")
            return 0

# 全局存储管理器实例
storage_manager = StorageManager()
