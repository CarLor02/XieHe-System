"""
DICOM文件处理器

负责DICOM文件的读取、元数据提取和格式转换

作者: XieHe Medical System
创建时间: 2026-02-08
"""

import logging
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime, date

from models import PatientInfo, ImageMetadata
from config import settings

# 尝试导入DICOM处理库
try:
    import pydicom
    from pydicom.errors import InvalidDicomError
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False
    print("警告: pydicom库未安装，DICOM处理功能将不可用")

# 尝试导入图像处理库
try:
    from PIL import Image
    import numpy as np
    IMAGE_LIBS_AVAILABLE = True
except ImportError:
    IMAGE_LIBS_AVAILABLE = False
    print("警告: PIL或numpy库未安装，图像转换功能将不可用")

logger = logging.getLogger(__name__)


class DicomProcessor:
    """DICOM文件处理器"""
    
    def __init__(self, output_dir: Path = None):
        """
        初始化DICOM处理器
        
        Args:
            output_dir: JPG输出目录
        """
        self.output_dir = output_dir or Path(settings.OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        if not PYDICOM_AVAILABLE:
            raise RuntimeError("pydicom库未安装，无法处理DICOM文件")
        
        if not IMAGE_LIBS_AVAILABLE:
            raise RuntimeError("PIL或numpy库未安装，无法转换图像")
    
    def extract_patient_info(self, dicom_path: Path) -> Optional[PatientInfo]:
        """
        从DICOM文件提取患者信息
        
        Args:
            dicom_path: DICOM文件路径
            
        Returns:
            PatientInfo对象，失败返回None
        """
        try:
            ds = pydicom.dcmread(str(dicom_path))
            
            # 提取患者ID（必需）
            patient_id = str(ds.get('PatientID', '')).strip()
            if not patient_id:
                logger.error(f"DICOM文件缺少PatientID: {dicom_path}")
                return None
            
            # 提取患者姓名
            patient_name = str(ds.get('PatientName', patient_id)).strip()
            if not patient_name:
                patient_name = patient_id
            
            # 提取性别
            gender_str = str(ds.get('PatientSex', 'U')).strip().upper()
            gender_map = {
                'M': 'MALE',
                'F': 'FEMALE',
                'O': 'OTHER',
                'U': 'UNKNOWN'
            }
            gender = gender_map.get(gender_str, 'UNKNOWN')
            
            # 提取出生日期
            birth_date = None
            birth_date_str = str(ds.get('PatientBirthDate', '')).strip()
            if birth_date_str and len(birth_date_str) == 8:
                try:
                    birth_date = datetime.strptime(birth_date_str, '%Y%m%d').date()
                except ValueError:
                    pass
            
            # 计算年龄
            age = None
            if birth_date:
                today = date.today()
                age = today.year - birth_date.year
                if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                    age -= 1
            
            return PatientInfo(
                patient_id=patient_id,
                name=patient_name,
                gender=gender,
                birth_date=birth_date,
                age=age
            )
            
        except InvalidDicomError as e:
            logger.error(f"无效的DICOM文件: {dicom_path}, 错误: {e}")
            return None
        except Exception as e:
            logger.error(f"读取DICOM文件失败: {dicom_path}, 错误: {e}")
            return None
    
    def extract_image_metadata(self, dicom_path: Path) -> Optional[ImageMetadata]:
        """
        从DICOM文件提取影像元数据
        
        Args:
            dicom_path: DICOM文件路径
            
        Returns:
            ImageMetadata对象，失败返回None
        """
        try:
            ds = pydicom.dcmread(str(dicom_path))
            
            # 提取模态
            modality = str(ds.get('Modality', 'XR')).strip()
            
            # 提取检查日期
            study_date = None
            study_date_str = str(ds.get('StudyDate', '')).strip()
            if study_date_str and len(study_date_str) == 8:
                try:
                    study_date = datetime.strptime(study_date_str, '%Y%m%d')
                except ValueError:
                    pass
            
            # 提取描述
            study_description = str(ds.get('StudyDescription', '')).strip()
            series_description = str(ds.get('SeriesDescription', '')).strip()
            description = study_description or series_description or f"{modality}影像"
            
            # 提取UID
            study_instance_uid = str(ds.get('StudyInstanceUID', '')).strip() or None
            series_instance_uid = str(ds.get('SeriesInstanceUID', '')).strip() or None
            sop_instance_uid = str(ds.get('SOPInstanceUID', '')).strip() or None
            
            return ImageMetadata(
                modality=modality,
                study_date=study_date,
                description=description,
                series_description=series_description,
                study_instance_uid=study_instance_uid,
                series_instance_uid=series_instance_uid,
                sop_instance_uid=sop_instance_uid
            )
            
        except Exception as e:
            logger.error(f"提取DICOM元数据失败: {dicom_path}, 错误: {e}")
            return None

    def convert_dicom_to_jpg(self, dicom_path: Path) -> Optional[Path]:
        """
        将DICOM文件转换为JPG格式

        Args:
            dicom_path: DICOM文件路径

        Returns:
            JPG文件路径，失败返回None
        """
        try:
            # 读取DICOM文件
            ds = pydicom.dcmread(str(dicom_path))

            # 获取像素数据
            pixel_array = ds.pixel_array

            # 应用窗宽窗位（如果有）
            if hasattr(ds, 'WindowCenter') and hasattr(ds, 'WindowWidth'):
                window_center = float(ds.WindowCenter) if not isinstance(ds.WindowCenter, (list, tuple)) else float(ds.WindowCenter[0])
                window_width = float(ds.WindowWidth) if not isinstance(ds.WindowWidth, (list, tuple)) else float(ds.WindowWidth[0])

                # 计算窗口范围
                window_min = window_center - window_width / 2
                window_max = window_center + window_width / 2

                # 应用窗宽窗位
                pixel_array = np.clip(pixel_array, window_min, window_max)
                pixel_array = ((pixel_array - window_min) / (window_max - window_min) * 255).astype(np.uint8)
            else:
                # 归一化到0-255
                pixel_min = pixel_array.min()
                pixel_max = pixel_array.max()
                if pixel_max > pixel_min:
                    pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
                else:
                    pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)

            # 创建输出目录（按日期组织）
            date_dir = self.output_dir / datetime.now().strftime('%Y%m%d')
            date_dir.mkdir(parents=True, exist_ok=True)

            # 生成JPG文件名
            jpg_filename = dicom_path.stem + '.jpg'
            jpg_path = date_dir / jpg_filename

            # 保存为JPG
            image = Image.fromarray(pixel_array)
            image.save(jpg_path, 'JPEG', quality=settings.JPG_QUALITY)

            logger.info(f"DICOM转JPG成功: {dicom_path.name} -> {jpg_path.name}")
            return jpg_path

        except Exception as e:
            logger.error(f"DICOM转JPG失败: {dicom_path}, 错误: {e}")
            return None

