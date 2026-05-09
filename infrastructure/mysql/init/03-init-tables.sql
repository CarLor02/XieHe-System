-- 医疗影像诊断系统 - 基础表结构初始化脚本
-- 创建系统必需的基础表

USE `medical_system`;

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'doctor', 'technician', 'nurse') NOT NULL DEFAULT 'doctor',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建患者表
CREATE TABLE IF NOT EXISTS `patients` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(50) UNIQUE NOT NULL COMMENT '患者编号',
    `name` VARCHAR(100) NOT NULL,
    `birth_date` DATE COMMENT '出生日期',
    `age` INT NOT NULL,
    `gender` ENUM('male', 'female', 'other') NOT NULL,
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `address` TEXT,
    `id_card` VARCHAR(20),
    `medical_insurance` VARCHAR(50) COMMENT '医保号',
    `emergency_contact` VARCHAR(100),
    `emergency_phone` VARCHAR(20),
    `medical_history` JSON,
    `allergies` JSON,
    `blood_type` VARCHAR(10),
    `height` DECIMAL(5,2),
    `weight` DECIMAL(5,2),
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `deleted_at` TIMESTAMP NULL,
    `created_by` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_name` (`name`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_id_card` (`id_card`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建医学影像表
CREATE TABLE IF NOT EXISTS `medical_images` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(36) NOT NULL,
    `study_uid` VARCHAR(100) UNIQUE COMMENT 'DICOM研究UID',
    `series_uid` VARCHAR(100) COMMENT 'DICOM序列UID',
    `instance_uid` VARCHAR(100) UNIQUE COMMENT 'DICOM实例UID',
    `study_id` VARCHAR(100),
    `series_id` VARCHAR(100),
    `instance_id` VARCHAR(100),
    `modality` VARCHAR(10) NOT NULL,
    `body_part` VARCHAR(50),
    `study_description` VARCHAR(200) COMMENT '检查描述',
    `series_description` VARCHAR(200) COMMENT '序列描述',
    `file_path` VARCHAR(500) NOT NULL,
    `thumbnail_path` VARCHAR(500) COMMENT '缩略图路径',
    `file_size` BIGINT,
    `file_format` VARCHAR(10),
    `acquisition_date` DATE,
    `acquisition_time` TIME,
    `image_rows` INT COMMENT '图像行数',
    `image_columns` INT COMMENT '图像列数',
    `window_center` DECIMAL(10,2) COMMENT '窗位',
    `window_width` DECIMAL(10,2) COMMENT '窗宽',
    `metadata` JSON,
    `status` ENUM('uploaded', 'processing', 'processed', 'failed') DEFAULT 'uploaded',
    `created_by` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_study_uid` (`study_uid`),
    INDEX `idx_series_uid` (`series_uid`),
    INDEX `idx_instance_uid` (`instance_uid`),
    INDEX `idx_study_id` (`study_id`),
    INDEX `idx_modality` (`modality`),
    INDEX `idx_acquisition_date` (`acquisition_date`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建报告模板表
CREATE TABLE IF NOT EXISTS `report_templates` (
    `id` VARCHAR(36) PRIMARY KEY,
    `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称',
    `template_type` ENUM('RADIOLOGY', 'PATHOLOGY', 'LABORATORY', 'OTHER') NOT NULL DEFAULT 'RADIOLOGY',
    `modality` VARCHAR(20) COMMENT '影像模态',
    `body_part` VARCHAR(100) COMMENT '检查部位',
    `description` TEXT COMMENT '模板描述',
    `template_content` JSON NOT NULL COMMENT '模板内容',
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_default` BOOLEAN DEFAULT FALSE,
    `created_by` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_template_name` (`template_name`),
    INDEX `idx_template_type` (`template_type`),
    INDEX `idx_modality` (`modality`),
    INDEX `idx_body_part` (`body_part`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建诊断报告表
CREATE TABLE IF NOT EXISTS `diagnosis_reports` (
    `id` VARCHAR(36) PRIMARY KEY,
    `report_number` VARCHAR(100) UNIQUE NOT NULL COMMENT '报告编号',
    `patient_id` VARCHAR(36) NOT NULL,
    `image_id` VARCHAR(36),
    `template_id` VARCHAR(36) COMMENT '报告模板ID',
    `doctor_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `clinical_history` TEXT COMMENT '临床病史',
    `examination_technique` TEXT COMMENT '检查技术',
    `findings` TEXT,
    `impression` TEXT,
    `recommendations` TEXT,
    `notes` TEXT COMMENT '备注',
    `tags` JSON COMMENT '标签',
    `ai_assisted` BOOLEAN DEFAULT FALSE COMMENT 'AI辅助标识',
    `ai_confidence` DECIMAL(3,2) COMMENT 'AI置信度',
    `status` ENUM('draft', 'pending', 'approved', 'rejected', 'finalized') DEFAULT 'draft',
    `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    `report_date` DATE NOT NULL,
    `examination_date` DATE COMMENT '检查日期',
    `approved_by` VARCHAR(36),
    `approved_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`image_id`) REFERENCES `medical_images`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`template_id`) REFERENCES `report_templates`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`),
    INDEX `idx_report_number` (`report_number`),
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_doctor_id` (`doctor_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_report_date` (`report_date`),
    INDEX `idx_examination_date` (`examination_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(36),
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(50),
    `resource_id` VARCHAR(36),
    `details` JSON,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_resource_type` (`resource_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 创建角色表
CREATE TABLE IF NOT EXISTS `roles` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色名称',
    `display_name` VARCHAR(100) NOT NULL COMMENT '显示名称',
    `description` TEXT COMMENT '角色描述',
    `level` INT DEFAULT 0 COMMENT '角色级别',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建权限表
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限名称',
    `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码',
    `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型',
    `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
    `description` TEXT COMMENT '权限描述',
    `conditions` JSON COMMENT '权限条件',
    `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统权限',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_code` (`code`),
    INDEX `idx_resource_type` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS `user_roles` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `granted_by` VARCHAR(36) COMMENT '授权人ID',
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_active` BOOLEAN DEFAULT TRUE,
    `expires_at` TIMESTAMP NULL COMMENT '过期时间',
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` VARCHAR(36) PRIMARY KEY,
    `role_id` VARCHAR(36) NOT NULL,
    `permission_id` VARCHAR(36) NOT NULL,
    `granted_by` VARCHAR(36) COMMENT '授权人ID',
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 创建系统配置表
CREATE TABLE IF NOT EXISTS `system_configs` (
    `id` VARCHAR(36) PRIMARY KEY,
    `config_key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    `config_value` TEXT COMMENT '配置值',
    `config_type` ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    `description` TEXT COMMENT '配置描述',
    `is_public` BOOLEAN DEFAULT FALSE COMMENT '是否公开配置',
    `created_by` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统日志表
CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `log_level` ENUM('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    `log_type` VARCHAR(50) NOT NULL COMMENT '日志类型',
    `message` TEXT NOT NULL COMMENT '日志消息',
    `module` VARCHAR(100) COMMENT '模块名称',
    `function_name` VARCHAR(100) COMMENT '函数名称',
    `user_id` VARCHAR(36) COMMENT '用户ID',
    `ip_address` VARCHAR(45) COMMENT 'IP地址',
    `user_agent` TEXT COMMENT '用户代理',
    `request_id` VARCHAR(100) COMMENT '请求ID',
    `extra_data` JSON COMMENT '额外数据',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_log_level` (`log_level`),
    INDEX `idx_log_type` (`log_type`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建通知消息表
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
    `message` TEXT NOT NULL COMMENT '通知内容',
    `notification_type` ENUM('INFO', 'WARNING', 'ERROR', 'SUCCESS') DEFAULT 'INFO',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    `sender_id` VARCHAR(36) COMMENT '发送者ID',
    `target_type` ENUM('USER', 'ROLE', 'ALL') DEFAULT 'USER',
    `target_id` VARCHAR(36) COMMENT '目标ID',
    `is_read` BOOLEAN DEFAULT FALSE,
    `read_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NULL COMMENT '过期时间',
    `extra_data` JSON COMMENT '额外数据',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_target_type_id` (`target_type`, `target_id`),
    INDEX `idx_notification_type` (`notification_type`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_is_read` (`is_read`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统监控指标表
CREATE TABLE IF NOT EXISTS `system_metrics` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `metric_name` VARCHAR(100) NOT NULL COMMENT '指标名称',
    `metric_value` DECIMAL(15,4) NOT NULL COMMENT '指标值',
    `metric_unit` VARCHAR(20) COMMENT '指标单位',
    `metric_type` ENUM('COUNTER', 'GAUGE', 'HISTOGRAM') DEFAULT 'GAUGE',
    `server_name` VARCHAR(100) COMMENT '服务器名称',
    `tags` JSON COMMENT '标签',
    `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_metric_name` (`metric_name`),
    INDEX `idx_server_name` (`server_name`),
    INDEX `idx_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统告警表
CREATE TABLE IF NOT EXISTS `system_alerts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `alert_type` VARCHAR(50) NOT NULL COMMENT '告警类型',
    `alert_level` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    `alert_title` VARCHAR(200) NOT NULL COMMENT '告警标题',
    `alert_message` TEXT NOT NULL COMMENT '告警消息',
    `source_type` VARCHAR(50) COMMENT '来源类型',
    `source_id` VARCHAR(100) COMMENT '来源ID',
    `server_name` VARCHAR(100) COMMENT '服务器名称',
    `is_resolved` BOOLEAN DEFAULT FALSE,
    `resolved_at` TIMESTAMP NULL,
    `resolved_by` VARCHAR(36),
    `resolution_notes` TEXT COMMENT '解决备注',
    `alert_data` JSON COMMENT '告警数据',
    `threshold_value` DECIMAL(15,4) COMMENT '阈值',
    `current_value` DECIMAL(15,4) COMMENT '当前值',
    `notification_sent` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_alert_type` (`alert_type`),
    INDEX `idx_alert_level` (`alert_level`),
    INDEX `idx_is_resolved` (`is_resolved`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认角色
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `level`) VALUES
('role-admin', 'admin', '系统管理员', '系统管理员角色，拥有所有权限', 100),
('role-doctor', 'doctor', '医生', '医生角色，可以查看和编辑患者信息、影像和报告', 80),
('role-technician', 'technician', '技师', '技师角色，可以上传和处理影像', 60),
('role-nurse', 'nurse', '护士', '护士角色，可以查看患者基本信息', 40)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- 插入默认权限
INSERT INTO `permissions` (`id`, `name`, `code`, `resource_type`, `action`, `description`) VALUES
('perm-patient-read', '查看患者', 'patient:read', 'patient', 'read', '查看患者信息'),
('perm-patient-write', '编辑患者', 'patient:write', 'patient', 'write', '编辑患者信息'),
('perm-patient-delete', '删除患者', 'patient:delete', 'patient', 'delete', '删除患者信息'),
('perm-image-read', '查看影像', 'image:read', 'image', 'read', '查看医学影像'),
('perm-image-write', '上传影像', 'image:write', 'image', 'write', '上传和编辑医学影像'),
('perm-report-read', '查看报告', 'report:read', 'report', 'read', '查看诊断报告'),
('perm-report-write', '编辑报告', 'report:write', 'report', 'write', '编辑诊断报告'),
('perm-system-admin', '系统管理', 'system:admin', 'system', 'admin', '系统管理权限')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 插入默认报告模板
INSERT INTO `report_templates` (`id`, `template_name`, `template_type`, `modality`, `body_part`, `description`, `template_content`, `is_default`) VALUES
('template-chest-ct', '胸部CT报告模板', 'RADIOLOGY', 'CT', '胸部', '标准胸部CT检查报告模板',
'{"sections": [{"id": "clinical_history", "name": "临床病史", "type": "textarea", "required": true}, {"id": "examination_technique", "name": "检查技术", "type": "textarea", "content": "胸部CT平扫+增强扫描"}, {"id": "findings", "name": "检查所见", "type": "textarea", "required": true}, {"id": "impression", "name": "诊断意见", "type": "textarea", "required": true}]}',
true),
('template-xray-chest', '胸部X光报告模板', 'RADIOLOGY', 'XR', '胸部', '标准胸部X光检查报告模板',
'{"sections": [{"id": "clinical_history", "name": "临床病史", "type": "textarea", "required": true}, {"id": "examination_technique", "name": "检查技术", "type": "textarea", "content": "胸部正侧位X光摄影"}, {"id": "findings", "name": "检查所见", "type": "textarea", "required": true}, {"id": "impression", "name": "诊断意见", "type": "textarea", "required": true}]}',
true)
ON DUPLICATE KEY UPDATE `template_name` = VALUES(`template_name`);

-- 创建默认管理员用户 (密码: admin123)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`) VALUES
('admin-user-id-001', 'admin', 'admin@medical-system.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyV8Eim', '系统管理员', 'admin')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 显示创建的表
SHOW TABLES;

-- 显示主要表结构
DESCRIBE users;
DESCRIBE patients;
DESCRIBE medical_images;
DESCRIBE diagnosis_reports;
DESCRIBE roles;
DESCRIBE permissions;
DESCRIBE report_templates;
