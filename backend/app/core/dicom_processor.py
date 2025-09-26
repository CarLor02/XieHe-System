"""
DICOM文件处理模块

集成pydicom库，实现DICOM文件解析、元数据提取、格式转换

@author XieHe Medical System
@created 2025-09-24
"""

import os
import json
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime
from PIL import Image
import io

try:
    import pydicom
    from pydicom import dcmread
    from pydicom.errors import InvalidDicomError
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)

class DICOMProcessor:
    """DICOM文件处理器"""
    
    def __init__(self):
        if not PYDICOM_AVAILABLE:
            raise ImportError("pydicom库未安装，请运行: pip install pydicom")
        
        self.supported_transfer_syntaxes = [
            '1.2.840.10008.1.2',      # Implicit VR Little Endian
            '1.2.840.10008.1.2.1',    # Explicit VR Little Endian
            '1.2.840.10008.1.2.2',    # Explicit VR Big Endian
            '1.2.840.10008.1.2.4.50', # JPEG Baseline
            '1.2.840.10008.1.2.4.51', # JPEG Extended
            '1.2.840.10008.1.2.4.57', # JPEG Lossless
            '1.2.840.10008.1.2.4.70', # JPEG Lossless SV1
        ]
    
    def validate_dicom_file(self, file_path: Path) -> bool:
        """
        验证DICOM文件有效性
        
        Args:
            file_path: DICOM文件路径
            
        Returns:
            bool: 是否为有效的DICOM文件
        """
        try:
            dcmread(file_path, stop_before_pixels=True)
            return True
        except (InvalidDicomError, Exception) as e:
            logger.warning(f"DICOM文件验证失败 {file_path}: {e}")
            return False
    
    def extract_metadata(self, file_path: Path) -> Dict[str, Any]:
        """
        提取DICOM元数据
        
        Args:
            file_path: DICOM文件路径
            
        Returns:
            Dict: DICOM元数据字典
        """
        try:
            ds = dcmread(file_path)
            
            metadata = {
                # 患者信息
                'patient_id': getattr(ds, 'PatientID', ''),
                'patient_name': str(getattr(ds, 'PatientName', '')),
                'patient_birth_date': getattr(ds, 'PatientBirthDate', ''),
                'patient_sex': getattr(ds, 'PatientSex', ''),
                'patient_age': getattr(ds, 'PatientAge', ''),
                
                # 检查信息
                'study_instance_uid': getattr(ds, 'StudyInstanceUID', ''),
                'study_date': getattr(ds, 'StudyDate', ''),
                'study_time': getattr(ds, 'StudyTime', ''),
                'study_description': getattr(ds, 'StudyDescription', ''),
                'accession_number': getattr(ds, 'AccessionNumber', ''),
                
                # 序列信息
                'series_instance_uid': getattr(ds, 'SeriesInstanceUID', ''),
                'series_number': getattr(ds, 'SeriesNumber', ''),
                'series_description': getattr(ds, 'SeriesDescription', ''),
                'modality': getattr(ds, 'Modality', ''),
                
                # 图像信息
                'sop_instance_uid': getattr(ds, 'SOPInstanceUID', ''),
                'instance_number': getattr(ds, 'InstanceNumber', ''),
                'rows': getattr(ds, 'Rows', 0),
                'columns': getattr(ds, 'Columns', 0),
                'pixel_spacing': getattr(ds, 'PixelSpacing', []),
                'slice_thickness': getattr(ds, 'SliceThickness', ''),
                'slice_location': getattr(ds, 'SliceLocation', ''),
                
                # 设备信息
                'manufacturer': getattr(ds, 'Manufacturer', ''),
                'manufacturer_model_name': getattr(ds, 'ManufacturerModelName', ''),
                'station_name': getattr(ds, 'StationName', ''),
                
                # 技术参数
                'kvp': getattr(ds, 'KVP', ''),
                'exposure_time': getattr(ds, 'ExposureTime', ''),
                'x_ray_tube_current': getattr(ds, 'XRayTubeCurrent', ''),
                
                # 窗宽窗位
                'window_center': getattr(ds, 'WindowCenter', ''),
                'window_width': getattr(ds, 'WindowWidth', ''),
                
                # 文件信息
                'transfer_syntax_uid': getattr(ds, 'file_meta', {}).get('TransferSyntaxUID', ''),
                'implementation_class_uid': getattr(ds, 'file_meta', {}).get('ImplementationClassUID', ''),
                'file_size': file_path.stat().st_size,
                'created_at': datetime.now().isoformat(),
            }
            
            # 处理特殊字段
            if hasattr(ds, 'PixelSpacing') and ds.PixelSpacing:
                metadata['pixel_spacing'] = [float(x) for x in ds.PixelSpacing]
            
            if hasattr(ds, 'WindowCenter'):
                if isinstance(ds.WindowCenter, (list, tuple)):
                    metadata['window_center'] = [float(x) for x in ds.WindowCenter]
                else:
                    metadata['window_center'] = float(ds.WindowCenter)
            
            if hasattr(ds, 'WindowWidth'):
                if isinstance(ds.WindowWidth, (list, tuple)):
                    metadata['window_width'] = [float(x) for x in ds.WindowWidth]
                else:
                    metadata['window_width'] = float(ds.WindowWidth)
            
            logger.info(f"DICOM元数据提取成功: {file_path}")
            return metadata
            
        except Exception as e:
            logger.error(f"DICOM元数据提取失败 {file_path}: {e}")
            return {}
    
    def extract_pixel_data(self, file_path: Path) -> Optional[np.ndarray]:
        """
        提取DICOM像素数据
        
        Args:
            file_path: DICOM文件路径
            
        Returns:
            np.ndarray: 像素数据数组，失败返回None
        """
        try:
            ds = dcmread(file_path)
            
            if not hasattr(ds, 'pixel_array'):
                logger.warning(f"DICOM文件无像素数据: {file_path}")
                return None
            
            pixel_array = ds.pixel_array
            
            # 应用窗宽窗位
            if hasattr(ds, 'WindowCenter') and hasattr(ds, 'WindowWidth'):
                window_center = ds.WindowCenter
                window_width = ds.WindowWidth
                
                if isinstance(window_center, (list, tuple)):
                    window_center = window_center[0]
                if isinstance(window_width, (list, tuple)):
                    window_width = window_width[0]
                
                # 窗宽窗位变换
                window_min = window_center - window_width / 2
                window_max = window_center + window_width / 2
                
                pixel_array = np.clip(pixel_array, window_min, window_max)
                pixel_array = ((pixel_array - window_min) / (window_max - window_min) * 255).astype(np.uint8)
            
            logger.info(f"DICOM像素数据提取成功: {file_path}, shape: {pixel_array.shape}")
            return pixel_array
            
        except Exception as e:
            logger.error(f"DICOM像素数据提取失败 {file_path}: {e}")
            return None
    
    def convert_to_image(self, file_path: Path, output_format: str = 'PNG') -> Optional[bytes]:
        """
        将DICOM转换为标准图像格式
        
        Args:
            file_path: DICOM文件路径
            output_format: 输出格式 (PNG, JPEG, TIFF)
            
        Returns:
            bytes: 图像数据，失败返回None
        """
        try:
            pixel_array = self.extract_pixel_data(file_path)
            if pixel_array is None:
                return None
            
            # 处理多维数组
            if len(pixel_array.shape) > 2:
                # 取第一帧或中间帧
                if len(pixel_array.shape) == 3:
                    pixel_array = pixel_array[pixel_array.shape[0] // 2]
                elif len(pixel_array.shape) == 4:
                    pixel_array = pixel_array[0, pixel_array.shape[1] // 2]
            
            # 确保数据类型正确
            if pixel_array.dtype != np.uint8:
                pixel_array = ((pixel_array - pixel_array.min()) / 
                              (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
            
            # 创建PIL图像
            image = Image.fromarray(pixel_array, mode='L')  # 灰度图像
            
            # 转换为指定格式
            output_buffer = io.BytesIO()
            image.save(output_buffer, format=output_format.upper())
            
            logger.info(f"DICOM转换为{output_format}成功: {file_path}")
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"DICOM转换失败 {file_path}: {e}")
            return None
    
    def generate_thumbnail(self, file_path: Path, size: Tuple[int, int] = (256, 256)) -> Optional[bytes]:
        """
        生成DICOM缩略图
        
        Args:
            file_path: DICOM文件路径
            size: 缩略图尺寸
            
        Returns:
            bytes: 缩略图数据，失败返回None
        """
        try:
            pixel_array = self.extract_pixel_data(file_path)
            if pixel_array is None:
                return None
            
            # 处理多维数组
            if len(pixel_array.shape) > 2:
                if len(pixel_array.shape) == 3:
                    pixel_array = pixel_array[pixel_array.shape[0] // 2]
                elif len(pixel_array.shape) == 4:
                    pixel_array = pixel_array[0, pixel_array.shape[1] // 2]
            
            # 确保数据类型正确
            if pixel_array.dtype != np.uint8:
                pixel_array = ((pixel_array - pixel_array.min()) / 
                              (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
            
            # 创建PIL图像并生成缩略图
            image = Image.fromarray(pixel_array, mode='L')
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # 保存为JPEG格式
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG', quality=85)
            
            logger.info(f"DICOM缩略图生成成功: {file_path}, size: {size}")
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"DICOM缩略图生成失败 {file_path}: {e}")
            return None
    
    def get_dicom_info(self, file_path: Path) -> Dict[str, Any]:
        """
        获取DICOM文件完整信息
        
        Args:
            file_path: DICOM文件路径
            
        Returns:
            Dict: 包含元数据和图像信息的字典
        """
        try:
            # 基础验证
            if not self.validate_dicom_file(file_path):
                return {'error': 'Invalid DICOM file'}
            
            # 提取元数据
            metadata = self.extract_metadata(file_path)
            
            # 获取像素数据信息
            ds = dcmread(file_path)
            
            info = {
                'metadata': metadata,
                'image_info': {
                    'has_pixel_data': hasattr(ds, 'pixel_array'),
                    'photometric_interpretation': getattr(ds, 'PhotometricInterpretation', ''),
                    'samples_per_pixel': getattr(ds, 'SamplesPerPixel', 0),
                    'bits_allocated': getattr(ds, 'BitsAllocated', 0),
                    'bits_stored': getattr(ds, 'BitsStored', 0),
                    'high_bit': getattr(ds, 'HighBit', 0),
                    'pixel_representation': getattr(ds, 'PixelRepresentation', 0),
                },
                'file_info': {
                    'file_path': str(file_path),
                    'file_size': file_path.stat().st_size,
                    'modified_time': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                }
            }
            
            # 如果有像素数据，获取数组信息
            if hasattr(ds, 'pixel_array'):
                try:
                    pixel_array = ds.pixel_array
                    info['image_info'].update({
                        'pixel_array_shape': pixel_array.shape,
                        'pixel_array_dtype': str(pixel_array.dtype),
                        'pixel_min': float(pixel_array.min()),
                        'pixel_max': float(pixel_array.max()),
                        'pixel_mean': float(pixel_array.mean()),
                    })
                except Exception as e:
                    logger.warning(f"获取像素数组信息失败: {e}")
            
            return info
            
        except Exception as e:
            logger.error(f"获取DICOM信息失败 {file_path}: {e}")
            return {'error': str(e)}
    
    def batch_process(self, file_paths: List[Path], extract_thumbnails: bool = True) -> List[Dict[str, Any]]:
        """
        批量处理DICOM文件
        
        Args:
            file_paths: DICOM文件路径列表
            extract_thumbnails: 是否提取缩略图
            
        Returns:
            List[Dict]: 处理结果列表
        """
        results = []
        
        for file_path in file_paths:
            try:
                result = {
                    'file_path': str(file_path),
                    'success': False,
                    'info': None,
                    'thumbnail': None,
                    'error': None
                }
                
                # 获取DICOM信息
                info = self.get_dicom_info(file_path)
                if 'error' not in info:
                    result['success'] = True
                    result['info'] = info
                    
                    # 生成缩略图
                    if extract_thumbnails:
                        thumbnail = self.generate_thumbnail(file_path)
                        if thumbnail:
                            result['thumbnail'] = thumbnail
                else:
                    result['error'] = info['error']
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"批量处理DICOM文件失败 {file_path}: {e}")
                results.append({
                    'file_path': str(file_path),
                    'success': False,
                    'info': None,
                    'thumbnail': None,
                    'error': str(e)
                })
        
        logger.info(f"批量处理完成: {len(results)} 个文件")
        return results

# 全局DICOM处理器实例
dicom_processor = DICOMProcessor() if PYDICOM_AVAILABLE else None
