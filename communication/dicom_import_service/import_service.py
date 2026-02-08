"""
DICOM导入服务主逻辑

负责协调DICOM文件扫描、处理和上传

作者: XieHe Medical System
创建时间: 2026-02-08
"""

import logging
from pathlib import Path
from typing import Dict, List
from datetime import datetime

from dicom_processor import DicomProcessor
from api_client import XieHeAPIClient
from models import ImportTaskStats
from config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class DicomImportService:
    """DICOM导入服务"""
    
    def __init__(self, backend_url: str, api_token: str):
        """
        初始化导入服务
        
        Args:
            backend_url: 后端API URL
            api_token: API认证token
        """
        self.backend_url = backend_url
        self.api_token = api_token
        self.processor = DicomProcessor()
        self.api_client = XieHeAPIClient(backend_url, api_token)
        self.stats = ImportTaskStats()
    
    def import_dicom_directory(self, source_path: str) -> Dict:
        """
        导入DICOM目录
        
        Args:
            source_path: DICOM文件根目录
            
        Returns:
            导入统计信息
        """
        source_dir = Path(source_path)
        logger.info(f"开始扫描DICOM目录: {source_dir}")
        
        # 扫描月份目录（格式：YYYY-MM）
        month_dirs = [d for d in source_dir.iterdir() if d.is_dir()]
        logger.info(f"找到 {len(month_dirs)} 个月份目录")
        
        for month_dir in sorted(month_dirs):
            logger.info(f"处理月份目录: {month_dir.name}")
            self._process_month_directory(month_dir)
        
        logger.info(f"DICOM导入完成，统计: {self.stats.dict()}")
        return self.stats.dict()
    
    def _process_month_directory(self, month_dir: Path):
        """
        处理月份目录
        
        Args:
            month_dir: 月份目录路径
        """
        # 扫描患者目录
        patient_dirs = [d for d in month_dir.iterdir() if d.is_dir()]
        logger.info(f"  找到 {len(patient_dirs)} 个患者目录")
        
        for patient_dir in sorted(patient_dirs):
            self._process_patient_directory(patient_dir)
    
    def _process_patient_directory(self, patient_dir: Path):
        """
        处理患者目录
        
        Args:
            patient_dir: 患者目录路径
        """
        logger.info(f"    处理患者目录: {patient_dir.name}")
        
        # 扫描DICOM文件
        dicom_files = list(patient_dir.glob('*.dcm')) + list(patient_dir.glob('*.dicom'))
        if not dicom_files:
            logger.warning(f"      患者目录中没有DICOM文件: {patient_dir}")
            return
        
        logger.info(f"      找到 {len(dicom_files)} 个DICOM文件")
        self.stats.total_files_scanned += len(dicom_files)
        
        # 从第一个DICOM文件提取患者信息
        first_dicom = dicom_files[0]
        patient_info = self.processor.extract_patient_info(first_dicom)
        
        if not patient_info:
            logger.error(f"      无法提取患者信息: {first_dicom}")
            self.stats.failed_files += len(dicom_files)
            return
        
        self.stats.total_patients_found += 1
        
        # 检查患者是否存在，不存在则创建
        patient_exists = self.api_client.check_patient_exists(patient_info.patient_id)
        
        if patient_exists:
            logger.info(f"      患者已存在: {patient_info.patient_id}")
            self.stats.existing_patients_skipped += 1
        else:
            # 创建患者
            created_patient = self.api_client.create_patient(patient_info)
            if created_patient:
                logger.info(f"      创建患者成功: {patient_info.patient_id}")
                self.stats.new_patients_created += 1
            else:
                logger.error(f"      创建患者失败: {patient_info.patient_id}")
                # 即使创建失败，也尝试上传影像（患者可能已存在）
        
        # 处理每个DICOM文件
        for dicom_file in dicom_files:
            self._process_dicom_file(dicom_file, patient_info.patient_id)
    
    def _process_dicom_file(self, dicom_path: Path, patient_id: str):
        """
        处理单个DICOM文件
        
        Args:
            dicom_path: DICOM文件路径
            patient_id: 患者ID
        """
        try:
            original_filename = dicom_path.name
            
            # 去重检查：基于患者ID + 图像名称
            if settings.ENABLE_DEDUPLICATION:
                if self.api_client.check_image_exists(patient_id, original_filename):
                    logger.info(f"        跳过重复影像: {patient_id}/{original_filename}")
                    self.stats.duplicate_images_skipped += 1
                    return
            
            # 转换DICOM为JPG
            jpg_path = self.processor.convert_dicom_to_jpg(dicom_path)
            if not jpg_path:
                logger.error(f"        DICOM转JPG失败: {dicom_path}")
                self.stats.failed_files += 1
                return
            
            # 提取影像元数据
            metadata = self.processor.extract_image_metadata(dicom_path)
            description = metadata.description if metadata else None
            
            # 上传影像
            uploaded_image = self.api_client.upload_image(
                jpg_path=jpg_path,
                patient_id=patient_id,
                original_filename=original_filename,
                description=description
            )
            
            if uploaded_image:
                logger.info(f"        上传影像成功: {patient_id}/{original_filename}")
                self.stats.new_images_uploaded += 1
            else:
                logger.error(f"        上传影像失败: {patient_id}/{original_filename}")
                self.stats.failed_files += 1
            
        except Exception as e:
            logger.error(f"        处理DICOM文件失败: {dicom_path}, 错误: {e}")
            self.stats.failed_files += 1
            self.stats.errors.append({
                'file': str(dicom_path),
                'patient_id': patient_id,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })

