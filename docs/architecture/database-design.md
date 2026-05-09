# 医疗影像诊断系统 - 数据库架构设计

## 📋 文档概述

本文档详细描述了医疗影像诊断系统的数据库架构设计，包括表结构设计、关系模型、索引策略、数据字典等核心内容。

**文档版本**: 1.0.0  
**创建日期**: 2025-09-24  
**更新日期**: 2025-09-24  
**作者**: 医疗影像团队

## 🎯 设计原则

### 数据库设计原则

1. **规范化设计**: 遵循第三范式，减少数据冗余
2. **性能优化**: 合理设计索引，优化查询性能
3. **数据完整性**: 确保数据的一致性和完整性
4. **可扩展性**: 支持业务扩展和数据增长
5. **安全性**: 敏感数据加密存储，访问控制

### 命名规范

- **表名**: 使用复数形式，小写字母，下划线分隔
- **字段名**: 小写字母，下划线分隔，语义明确
- **索引名**: `idx_表名_字段名` 或 `uk_表名_字段名`
- **外键名**: `fk_表名_引用表名`

## 🗄️ 数据库概览

### 技术选型

- **数据库**: MySQL 8.0+
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_0900_ai_ci
- **存储引擎**: InnoDB
- **事务隔离级别**: READ-COMMITTED

### 数据库结构

```
medical_imaging_system (主数据库)
├── 用户管理模块 (5张表)
├── 患者管理模块 (4张表)
├── 影像管理模块 (6张表)
├── 诊断报告模块 (5张表)
├── AI模型管理模块 (4张表)
├── 系统管理模块 (6张表)
└── 审计日志模块 (3张表)

总计: 33张核心业务表
```

## 📊 核心表结构设计

### 1. 用户管理模块

#### 1.1 用户表 (users)

```sql
CREATE TABLE `users` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '用户ID (UUID)',
    `username` VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    `email` VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
    `salt` VARCHAR(32) NOT NULL COMMENT '密码盐值',
    `full_name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
    `phone` VARCHAR(20) COMMENT '手机号',
    `avatar_url` VARCHAR(500) COMMENT '头像URL',
    `department_id` VARCHAR(36) COMMENT '部门ID',
    `job_title` VARCHAR(100) COMMENT '职位',
    `employee_id` VARCHAR(50) COMMENT '工号',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    `is_verified` BOOLEAN DEFAULT FALSE COMMENT '是否验证',
    `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
    `last_login_ip` VARCHAR(45) COMMENT '最后登录IP',
    `login_count` INT DEFAULT 0 COMMENT '登录次数',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL COMMENT '删除时间',

    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_department_id` (`department_id`),
    INDEX `idx_employee_id` (`employee_id`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';
```

#### 1.2 角色表 (roles)

```sql
CREATE TABLE `roles` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '角色ID',
    `name` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色名称',
    `display_name` VARCHAR(100) NOT NULL COMMENT '显示名称',
    `description` TEXT COMMENT '角色描述',
    `level` INT DEFAULT 0 COMMENT '角色级别',
    `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统角色',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_name` (`name`),
    INDEX `idx_level` (`level`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';
```

#### 1.3 权限表 (permissions)

```sql
CREATE TABLE `permissions` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '权限ID',
    `name` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限名称',
    `display_name` VARCHAR(100) NOT NULL COMMENT '显示名称',
    `description` TEXT COMMENT '权限描述',
    `resource` VARCHAR(50) NOT NULL COMMENT '资源类型',
    `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
    `conditions` JSON COMMENT '权限条件',
    `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统权限',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_name` (`name`),
    INDEX `idx_resource` (`resource`),
    INDEX `idx_action` (`action`),
    UNIQUE KEY `uk_resource_action` (`resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='权限表';
```

#### 1.4 用户角色关联表 (user_roles)

```sql
CREATE TABLE `user_roles` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
    `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
    `role_id` VARCHAR(36) NOT NULL COMMENT '角色ID',
    `granted_by` VARCHAR(36) COMMENT '授权人ID',
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    `expires_at` TIMESTAMP NULL COMMENT '过期时间',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否激活',

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_granted_at` (`granted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';
```

#### 1.5 角色权限关联表 (role_permissions)

```sql
CREATE TABLE `role_permissions` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
    `role_id` VARCHAR(36) NOT NULL COMMENT '角色ID',
    `permission_id` VARCHAR(36) NOT NULL COMMENT '权限ID',
    `granted_by` VARCHAR(36) COMMENT '授权人ID',
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',

    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色权限关联表';
```

### 2. 患者管理模块

#### 2.1 患者表 (patients)

```sql
CREATE TABLE `patients` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '患者ID',
    `patient_no` VARCHAR(50) UNIQUE NOT NULL COMMENT '患者编号',
    `name` VARCHAR(100) NOT NULL COMMENT '患者姓名',
    `name_pinyin` VARCHAR(200) COMMENT '姓名拼音',
    `gender` ENUM('male', 'female', 'other') NOT NULL COMMENT '性别',
    `birth_date` DATE COMMENT '出生日期',
    `age` INT COMMENT '年龄',
    `id_card` VARCHAR(20) COMMENT '身份证号',
    `phone` VARCHAR(20) COMMENT '手机号',
    `email` VARCHAR(100) COMMENT '邮箱',
    `address` TEXT COMMENT '地址',
    `emergency_contact` VARCHAR(100) COMMENT '紧急联系人',
    `emergency_phone` VARCHAR(20) COMMENT '紧急联系电话',
    `blood_type` VARCHAR(10) COMMENT '血型',
    `height` DECIMAL(5,2) COMMENT '身高(cm)',
    `weight` DECIMAL(5,2) COMMENT '体重(kg)',
    `allergies` JSON COMMENT '过敏史',
    `medical_history` JSON COMMENT '病史',
    `insurance_type` VARCHAR(50) COMMENT '医保类型',
    `insurance_no` VARCHAR(100) COMMENT '医保号',
    `created_by` VARCHAR(36) COMMENT '创建人',
    `updated_by` VARCHAR(36) COMMENT '更新人',
    `is_deleted` BOOLEAN DEFAULT FALSE COMMENT '是否删除',
    `deleted_at` TIMESTAMP NULL COMMENT '删除时间',
    `deleted_by` VARCHAR(36) COMMENT '删除人',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_patient_no` (`patient_no`),
    INDEX `idx_name` (`name`),
    INDEX `idx_name_pinyin` (`name_pinyin`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_id_card` (`id_card`),
    INDEX `idx_gender` (`gender`),
    INDEX `idx_birth_date` (`birth_date`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='患者表';
```

### 3. 影像管理模块

#### 3.1 影像研究表 (studies)

```sql
CREATE TABLE `studies` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '研究ID',
    `study_uid` VARCHAR(100) UNIQUE NOT NULL COMMENT '研究UID',
    `patient_id` VARCHAR(36) NOT NULL COMMENT '患者ID',
    `study_date` DATE NOT NULL COMMENT '检查日期',
    `study_time` TIME COMMENT '检查时间',
    `study_description` VARCHAR(200) COMMENT '检查描述',
    `modality` VARCHAR(10) NOT NULL COMMENT '设备类型',
    `body_part` VARCHAR(50) COMMENT '检查部位',
    `referring_physician` VARCHAR(100) COMMENT '申请医生',
    `performing_physician` VARCHAR(100) COMMENT '执行医生',
    `institution_name` VARCHAR(200) COMMENT '机构名称',
    `department_name` VARCHAR(100) COMMENT '科室名称',
    `station_name` VARCHAR(100) COMMENT '设备名称',
    `study_status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '研究状态',
    `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
    `series_count` INT DEFAULT 0 COMMENT '序列数量',
    `instance_count` INT DEFAULT 0 COMMENT '实例数量',
    `total_size` BIGINT DEFAULT 0 COMMENT '总大小(字节)',
    `created_by` VARCHAR(36) COMMENT '创建人',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_study_uid` (`study_uid`),
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_study_date` (`study_date`),
    INDEX `idx_modality` (`modality`),
    INDEX `idx_body_part` (`body_part`),
    INDEX `idx_study_status` (`study_status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='影像研究表';
```

#### 3.2 影像序列表 (series)

```sql
CREATE TABLE `series` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '序列ID',
    `series_uid` VARCHAR(100) UNIQUE NOT NULL COMMENT '序列UID',
    `study_id` VARCHAR(36) NOT NULL COMMENT '研究ID',
    `series_number` INT COMMENT '序列号',
    `series_description` VARCHAR(200) COMMENT '序列描述',
    `modality` VARCHAR(10) NOT NULL COMMENT '设备类型',
    `body_part` VARCHAR(50) COMMENT '检查部位',
    `protocol_name` VARCHAR(100) COMMENT '协议名称',
    `series_date` DATE COMMENT '序列日期',
    `series_time` TIME COMMENT '序列时间',
    `instance_count` INT DEFAULT 0 COMMENT '实例数量',
    `series_size` BIGINT DEFAULT 0 COMMENT '序列大小(字节)',
    `thumbnail_path` VARCHAR(500) COMMENT '缩略图路径',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON DELETE CASCADE,
    INDEX `idx_series_uid` (`series_uid`),
    INDEX `idx_study_id` (`study_id`),
    INDEX `idx_series_number` (`series_number`),
    INDEX `idx_modality` (`modality`),
    INDEX `idx_series_date` (`series_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='影像序列表';
```

#### 3.3 影像实例表 (instances)

```sql
CREATE TABLE `instances` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '实例ID',
    `instance_uid` VARCHAR(100) UNIQUE NOT NULL COMMENT '实例UID',
    `series_id` VARCHAR(36) NOT NULL COMMENT '序列ID',
    `instance_number` INT COMMENT '实例号',
    `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
    `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
    `file_size` BIGINT NOT NULL COMMENT '文件大小(字节)',
    `file_format` VARCHAR(10) DEFAULT 'dcm' COMMENT '文件格式',
    `content_date` DATE COMMENT '内容日期',
    `content_time` TIME COMMENT '内容时间',
    `rows` INT COMMENT '图像行数',
    `columns` INT COMMENT '图像列数',
    `bits_allocated` INT COMMENT '分配位数',
    `bits_stored` INT COMMENT '存储位数',
    `pixel_spacing` VARCHAR(50) COMMENT '像素间距',
    `slice_thickness` DECIMAL(10,4) COMMENT '层厚',
    `slice_location` DECIMAL(10,4) COMMENT '层位置',
    `window_center` VARCHAR(100) COMMENT '窗位',
    `window_width` VARCHAR(100) COMMENT '窗宽',
    `metadata` JSON COMMENT 'DICOM元数据',
    `checksum` VARCHAR(64) COMMENT '文件校验和',
    `upload_status` ENUM('uploading', 'completed', 'failed') DEFAULT 'completed' COMMENT '上传状态',
    `process_status` ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '处理状态',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE CASCADE,
    INDEX `idx_instance_uid` (`instance_uid`),
    INDEX `idx_series_id` (`series_id`),
    INDEX `idx_instance_number` (`instance_number`),
    INDEX `idx_file_path` (`file_path`),
    INDEX `idx_upload_status` (`upload_status`),
    INDEX `idx_process_status` (`process_status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='影像实例表';
```

### 4. 诊断报告模块

#### 4.1 诊断报告表 (diagnosis_reports)

```sql
CREATE TABLE `diagnosis_reports` (
    `id` VARCHAR(36) PRIMARY KEY COMMENT '报告ID',
    `report_no` VARCHAR(50) UNIQUE NOT NULL COMMENT '报告编号',
    `patient_id` VARCHAR(36) NOT NULL COMMENT '患者ID',
    `study_id` VARCHAR(36) NOT NULL COMMENT '研究ID',
    `template_id` VARCHAR(36) COMMENT '模板ID',
    `title` VARCHAR(200) NOT NULL COMMENT '报告标题',
    `clinical_info` TEXT COMMENT '临床信息',
    `examination_method` TEXT COMMENT '检查方法',
    `findings` TEXT COMMENT '检查所见',
    `impression` TEXT COMMENT '诊断意见',
    `recommendations` TEXT COMMENT '建议',
    `conclusion` TEXT COMMENT '结论',
    `report_content` LONGTEXT COMMENT '完整报告内容',
    `report_status` ENUM('draft', 'pending', 'reviewing', 'approved', 'rejected', 'cancelled') DEFAULT 'draft' COMMENT '报告状态',
    `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
    `report_date` DATE NOT NULL COMMENT '报告日期',
    `report_time` TIME COMMENT '报告时间',
    `doctor_id` VARCHAR(36) NOT NULL COMMENT '报告医生ID',
    `reviewer_id` VARCHAR(36) COMMENT '审核医生ID',
    `reviewed_at` TIMESTAMP NULL COMMENT '审核时间',
    `review_comments` TEXT COMMENT '审核意见',
    `approved_by` VARCHAR(36) COMMENT '批准人ID',
    `approved_at` TIMESTAMP NULL COMMENT '批准时间',
    `version` INT DEFAULT 1 COMMENT '版本号',
    `is_final` BOOLEAN DEFAULT FALSE COMMENT '是否最终版本',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_report_no` (`report_no`),
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_study_id` (`study_id`),
    INDEX `idx_doctor_id` (`doctor_id`),
    INDEX `idx_report_status` (`report_status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_report_date` (`report_date`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='诊断报告表';
```

### 5. 系统管理模块

#### 5.1 系统配置表 (system_configs)

```sql
CREATE TABLE `system_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
    `config_key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    `config_value` TEXT COMMENT '配置值',
    `config_type` ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string' COMMENT '配置类型',
    `category` VARCHAR(50) DEFAULT 'general' COMMENT '配置分类',
    `description` VARCHAR(255) COMMENT '配置描述',
    `is_public` BOOLEAN DEFAULT FALSE COMMENT '是否公开配置',
    `is_readonly` BOOLEAN DEFAULT FALSE COMMENT '是否只读',
    `validation_rule` VARCHAR(500) COMMENT '验证规则',
    `default_value` TEXT COMMENT '默认值',
    `created_by` VARCHAR(36) COMMENT '创建人',
    `updated_by` VARCHAR(36) COMMENT '更新人',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_config_key` (`config_key`),
    INDEX `idx_category` (`category`),
    INDEX `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统配置表';
```

#### 5.2 操作日志表 (audit_logs)

```sql
CREATE TABLE `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    `user_id` VARCHAR(36) COMMENT '用户ID',
    `username` VARCHAR(50) COMMENT '用户名',
    `action` VARCHAR(100) NOT NULL COMMENT '操作动作',
    `resource_type` VARCHAR(50) COMMENT '资源类型',
    `resource_id` VARCHAR(36) COMMENT '资源ID',
    `resource_name` VARCHAR(200) COMMENT '资源名称',
    `method` VARCHAR(10) COMMENT 'HTTP方法',
    `url` VARCHAR(500) COMMENT '请求URL',
    `ip_address` VARCHAR(45) COMMENT 'IP地址',
    `user_agent` TEXT COMMENT '用户代理',
    `request_data` JSON COMMENT '请求数据',
    `response_data` JSON COMMENT '响应数据',
    `status_code` INT COMMENT '状态码',
    `execution_time` INT COMMENT '执行时间(ms)',
    `error_message` TEXT COMMENT '错误信息',
    `session_id` VARCHAR(100) COMMENT '会话ID',
    `trace_id` VARCHAR(100) COMMENT '追踪ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_username` (`username`),
    INDEX `idx_action` (`action`),
    INDEX `idx_resource_type` (`resource_type`),
    INDEX `idx_resource_id` (`resource_id`),
    INDEX `idx_ip_address` (`ip_address`),
    INDEX `idx_status_code` (`status_code`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_trace_id` (`trace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志表';
```

## 🔗 数据库关系图

### 核心实体关系

```
用户管理模块:
users (用户) ←→ user_roles (用户角色) ←→ roles (角色)
roles (角色) ←→ role_permissions (角色权限) ←→ permissions (权限)

患者管理模块:
patients (患者) → studies (影像研究)

影像管理模块:
studies (影像研究) → series (影像序列) → instances (影像实例)

诊断报告模块:
patients (患者) → diagnosis_reports (诊断报告)
studies (影像研究) → diagnosis_reports (诊断报告)
users (用户) → diagnosis_reports (诊断报告) [医生、审核人]

系统管理模块:
users (用户) → system_configs (系统配置) [创建人、更新人]
users (用户) → audit_logs (操作日志)
```

## 📈 索引策略

### 主键索引

- 所有表使用 UUID 作为主键，确保全局唯一性
- 主键自动创建聚簇索引，优化基于 ID 的查询

### 唯一索引

```sql
-- 用户表
UNIQUE KEY `uk_users_username` (`username`)
UNIQUE KEY `uk_users_email` (`email`)

-- 患者表
UNIQUE KEY `uk_patients_patient_no` (`patient_no`)

-- 影像表
UNIQUE KEY `uk_studies_study_uid` (`study_uid`)
UNIQUE KEY `uk_series_series_uid` (`series_uid`)
UNIQUE KEY `uk_instances_instance_uid` (`instance_uid`)

-- 报告表
UNIQUE KEY `uk_diagnosis_reports_report_no` (`report_no`)
```

### 复合索引

```sql
-- 用户角色查询优化
CREATE INDEX `idx_user_roles_user_active` ON `user_roles` (`user_id`, `is_active`);

-- 患者搜索优化
CREATE INDEX `idx_patients_name_phone` ON `patients` (`name`, `phone`);
CREATE INDEX `idx_patients_search` ON `patients` (`name`, `phone`, `id_card`, `is_deleted`);

-- 影像查询优化
CREATE INDEX `idx_studies_patient_date` ON `studies` (`patient_id`, `study_date`);
CREATE INDEX `idx_studies_modality_status` ON `studies` (`modality`, `study_status`);

-- 报告查询优化
CREATE INDEX `idx_diagnosis_reports_doctor_date` ON `diagnosis_reports` (`doctor_id`, `report_date`);
CREATE INDEX `idx_diagnosis_reports_patient_status` ON `diagnosis_reports` (`patient_id`, `report_status`);

-- 日志查询优化
CREATE INDEX `idx_audit_logs_user_time` ON `audit_logs` (`user_id`, `created_at`);
CREATE INDEX `idx_audit_logs_action_time` ON `audit_logs` (`action`, `created_at`);
```

### 全文索引

```sql
-- 患者姓名拼音搜索
CREATE FULLTEXT INDEX `ft_patients_name_pinyin` ON `patients` (`name`, `name_pinyin`);

-- 报告内容搜索
CREATE FULLTEXT INDEX `ft_diagnosis_reports_content` ON `diagnosis_reports` (`findings`, `impression`, `recommendations`);
```

## 🔒 数据安全策略

### 敏感数据加密

```sql
-- 用户密码加密存储
password_hash = bcrypt.hashpw(password + salt, bcrypt.gensalt())

-- 身份证号加密存储
id_card = AES_ENCRYPT(id_card_plain, encryption_key)

-- 手机号部分脱敏显示
phone_display = CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4))
```

### 数据访问控制

- 基于 RBAC 的数据访问控制
- 行级安全策略（RLS）
- 数据脱敏和匿名化

### 审计追踪

- 所有数据变更记录到 audit_logs 表
- 包含操作人、操作时间、操作内容
- 支持数据恢复和合规审计

## 📊 性能优化策略

### 分区策略

```sql
-- 按时间分区audit_logs表
CREATE TABLE `audit_logs` (
    -- 表结构...
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 按患者ID分区大表
CREATE TABLE `instances` (
    -- 表结构...
) ENGINE=InnoDB
PARTITION BY HASH(CRC32(LEFT(series_id, 8))) PARTITIONS 16;
```

### 读写分离

- 主库处理写操作和实时查询
- 从库处理统计查询和报表生成
- 使用中间件实现自动读写分离

### 缓存策略

```sql
-- 热点数据缓存
- 用户信息缓存 (TTL: 30分钟)
- 权限信息缓存 (TTL: 15分钟)
- 系统配置缓存 (TTL: 1小时)
- 患者基本信息缓存 (TTL: 10分钟)
```

## 🔄 数据备份策略

### 备份方案

```bash
# 全量备份 (每日凌晨2点)
mysqldump --single-transaction --routines --triggers \
  --master-data=2 medical_imaging_system > backup_full_$(date +%Y%m%d).sql

# 增量备份 (每小时)
mysqlbinlog --start-datetime="$(date -d '1 hour ago' '+%Y-%m-%d %H:00:00')" \
  --stop-datetime="$(date '+%Y-%m-%d %H:00:00')" \
  mysql-bin.* > backup_inc_$(date +%Y%m%d_%H).sql

# 数据验证
mysql -e "CHECKSUM TABLE medical_imaging_system.*;"
```

### 恢复策略

```bash
# 全量恢复
mysql medical_imaging_system < backup_full_20241201.sql

# 增量恢复
mysql medical_imaging_system < backup_inc_20241201_14.sql

# 点对点恢复
mysqlbinlog --start-position=1234 --stop-position=5678 mysql-bin.000001 | mysql
```

## 📋 数据字典

### 枚举值定义

#### 用户性别 (gender)

- `male`: 男性
- `female`: 女性
- `other`: 其他

#### 研究状态 (study_status)

- `scheduled`: 已预约
- `in_progress`: 进行中
- `completed`: 已完成
- `cancelled`: 已取消

#### 报告状态 (report_status)

- `draft`: 草稿
- `pending`: 待审核
- `reviewing`: 审核中
- `approved`: 已批准
- `rejected`: 已拒绝
- `cancelled`: 已取消

#### 优先级 (priority)

- `low`: 低优先级
- `normal`: 普通优先级
- `high`: 高优先级
- `urgent`: 紧急

#### 设备类型 (modality)

- `CT`: 计算机断层扫描
- `MR`: 磁共振成像
- `DR`: 数字化 X 射线摄影
- `CR`: 计算机 X 射线摄影
- `US`: 超声
- `XA`: X 射线血管造影
- `RF`: X 射线透视
- `MG`: 乳腺 X 射线摄影

### 数据类型说明

#### 时间字段

- `created_at`: 记录创建时间，自动设置
- `updated_at`: 记录更新时间，自动更新
- `deleted_at`: 软删除时间，NULL 表示未删除

#### JSON 字段

- `allergies`: 过敏史数组 `["青霉素", "海鲜"]`
- `medical_history`: 病史对象 `{"diabetes": "2020-01-01", "hypertension": "2019-06-15"}`
- `metadata`: DICOM 元数据对象
- `conditions`: 权限条件对象

## 🚀 扩展性设计

### 水平扩展

- 支持分库分表，按业务模块拆分
- 支持读写分离，提高查询性能
- 支持分区表，处理大数据量

### 垂直扩展

- 预留扩展字段，支持业务发展
- JSON 字段存储灵活数据
- 插件化权限系统

### 版本管理

- 使用 Alembic 进行数据库版本管理
- 支持数据库结构升级和回滚
- 自动化数据迁移脚本

---

**维护说明**: 本文档将随数据库结构变更持续更新，确保文档与实际数据库结构保持一致。
