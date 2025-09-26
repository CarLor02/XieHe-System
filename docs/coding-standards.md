# 医疗影像诊断系统编码规范

## 📋 概述

本文档定义了医疗影像诊断系统项目的编码规范，包括Python后端、TypeScript前端和SQL数据库的编码标准。遵循这些规范将确保代码的一致性、可读性和可维护性。

## 🐍 Python 编码规范

### 基本原则
- 遵循 PEP 8 标准
- 使用 4 个空格缩进，不使用 Tab
- 行长度限制为 88 字符（Black 格式化工具标准）
- 使用 UTF-8 编码

### 命名规范

#### 变量和函数
```python
# ✅ 正确：使用小写字母和下划线
user_name = "张三"
patient_id = 12345

def get_patient_info(patient_id: int) -> dict:
    """获取患者信息"""
    pass

def calculate_image_metrics(image_data: bytes) -> dict:
    """计算影像指标"""
    pass
```

#### 类名
```python
# ✅ 正确：使用 PascalCase
class PatientManager:
    """患者管理类"""
    pass

class DicomImageProcessor:
    """DICOM影像处理器"""
    pass
```

#### 常量
```python
# ✅ 正确：使用大写字母和下划线
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
DEFAULT_IMAGE_FORMAT = "DICOM"
API_VERSION = "v1"
```

#### 模块和包名
```python
# ✅ 正确：使用小写字母和下划线
import patient_manager
from image_processing import dicom_utils
```

### 类型注解
```python
from typing import List, Dict, Optional, Union
from datetime import datetime

def create_patient(
    name: str,
    age: int,
    gender: str,
    medical_history: Optional[List[str]] = None
) -> Dict[str, Union[str, int]]:
    """创建患者记录
    
    Args:
        name: 患者姓名
        age: 患者年龄
        gender: 患者性别
        medical_history: 病史记录，可选
        
    Returns:
        包含患者信息的字典
        
    Raises:
        ValueError: 当输入参数无效时
    """
    if age < 0 or age > 150:
        raise ValueError("年龄必须在0-150之间")
    
    return {
        "name": name,
        "age": age,
        "gender": gender,
        "created_at": datetime.now().isoformat()
    }
```

### 注释规范
```python
class ImageAnalyzer:
    """影像分析器
    
    用于分析医疗影像数据，提取关键特征和指标。
    支持DICOM、JPEG、PNG等格式。
    
    Attributes:
        model_path: AI模型文件路径
        threshold: 分析阈值
    """
    
    def __init__(self, model_path: str, threshold: float = 0.8):
        self.model_path = model_path
        self.threshold = threshold
    
    def analyze_image(self, image_path: str) -> dict:
        """分析单张影像
        
        Args:
            image_path: 影像文件路径
            
        Returns:
            分析结果字典，包含：
            - confidence: 置信度
            - findings: 发现列表
            - recommendations: 建议列表
        """
        # TODO: 实现影像分析逻辑
        pass
```

### 异常处理
```python
# ✅ 正确：具体的异常类型和清晰的错误信息
try:
    patient = get_patient_by_id(patient_id)
except PatientNotFoundError as e:
    logger.error(f"患者未找到: {patient_id}, 错误: {e}")
    raise HTTPException(status_code=404, detail=f"患者ID {patient_id} 不存在")
except DatabaseConnectionError as e:
    logger.error(f"数据库连接失败: {e}")
    raise HTTPException(status_code=500, detail="数据库服务暂时不可用")
```

## 🌐 TypeScript 编码规范

### 基本原则
- 使用 2 个空格缩进
- 使用分号结尾
- 使用单引号字符串
- 启用严格模式

### 命名规范

#### 变量和函数
```typescript
// ✅ 正确：使用 camelCase
const patientName = '张三';
const imageCount = 10;

function getPatientInfo(patientId: number): Promise<Patient> {
  // 实现逻辑
}

const calculateImageMetrics = async (imageData: ArrayBuffer): Promise<ImageMetrics> => {
  // 实现逻辑
};
```

#### 接口和类型
```typescript
// ✅ 正确：使用 PascalCase
interface Patient {
  id: number;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  createdAt: Date;
}

type ImageFormat = 'DICOM' | 'JPEG' | 'PNG';

class PatientManager {
  private patients: Patient[] = [];
  
  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> {
    // 实现逻辑
  }
}
```

#### 常量
```typescript
// ✅ 正确：使用 UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;
```

### 类型定义
```typescript
// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// 患者相关类型
interface PatientCreateRequest {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  medicalHistory?: string[];
}

interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 组件规范 (React)
```typescript
import React, { useState, useEffect } from 'react';

interface PatientCardProps {
  patient: Patient;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patientId: number) => void;
  className?: string;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  onEdit,
  onDelete,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(patient);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(patient.id);
    } catch (error) {
      console.error('删除患者失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`patient-card ${className}`}>
      <h3>{patient.name}</h3>
      <p>年龄: {patient.age}</p>
      <p>性别: {patient.gender}</p>
      
      <div className="actions">
        <button onClick={handleEdit} disabled={isLoading}>
          编辑
        </button>
        <button onClick={handleDelete} disabled={isLoading}>
          {isLoading ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  );
};
```

## 🗄️ SQL 编码规范

### 基本原则
- 使用大写关键字
- 使用下划线命名法
- 适当的缩进和换行
- 添加必要的注释

### 表名和字段名
```sql
-- ✅ 正确：使用小写字母和下划线
CREATE TABLE patients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '患者姓名',
    age INT NOT NULL COMMENT '年龄',
    gender ENUM('male', 'female', 'other') NOT NULL COMMENT '性别',
    phone VARCHAR(20) COMMENT '联系电话',
    email VARCHAR(100) COMMENT '邮箱地址',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);

CREATE TABLE medical_images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    file_size BIGINT NOT NULL COMMENT '文件大小(字节)',
    image_type ENUM('DICOM', 'JPEG', 'PNG') NOT NULL COMMENT '影像类型',
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_upload_time (upload_time)
);
```

### 查询语句格式
```sql
-- ✅ 正确：清晰的格式和缩进
SELECT 
    p.id,
    p.name,
    p.age,
    p.gender,
    COUNT(mi.id) as image_count,
    MAX(mi.upload_time) as last_upload_time
FROM patients p
LEFT JOIN medical_images mi ON p.id = mi.patient_id
WHERE p.created_at >= '2025-01-01'
    AND p.age BETWEEN 18 AND 80
GROUP BY p.id, p.name, p.age, p.gender
HAVING COUNT(mi.id) > 0
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;
```

### 存储过程和函数
```sql
DELIMITER //

CREATE PROCEDURE GetPatientStatistics(
    IN start_date DATE,
    IN end_date DATE
)
COMMENT '获取患者统计信息'
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 获取患者总数
    SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
        AVG(age) as average_age
    FROM patients
    WHERE created_at BETWEEN start_date AND end_date;

    COMMIT;
END //

DELIMITER ;
```

## 📁 文件和目录命名

### Python 文件
```
# ✅ 正确
patient_manager.py
image_processor.py
dicom_utils.py
api_routes.py
```

### TypeScript 文件
```
# ✅ 正确
PatientCard.tsx
ImageViewer.tsx
apiClient.ts
utils.ts
types.ts
```

### 目录结构
```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── patients.py
│   │   │   ├── images.py
│   │   │   └── auth.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   │   ├── patient.py
│   │   ├── image.py
│   │   └── user.py
│   └── services/
│       ├── patient_service.py
│       ├── image_service.py
│       └── ai_service.py

frontend/
├── components/
│   ├── common/
│   ├── patient/
│   └── image/
├── pages/
├── hooks/
├── types/
├── utils/
└── lib/
```

## 🔧 工具配置

### Python 工具
- **Black**: 代码格式化
- **isort**: 导入排序
- **flake8**: 代码检查
- **mypy**: 类型检查

### TypeScript 工具
- **Prettier**: 代码格式化
- **ESLint**: 代码检查
- **TypeScript**: 类型检查

### 配置文件示例
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

```ini
# .flake8
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = .git,__pycache__,docs/source/conf.py,old,build,dist
```

---

**版本**: v1.0  
**最后更新**: 2025-09-24  
**适用项目**: 医疗影像诊断系统
