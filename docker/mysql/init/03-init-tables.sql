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
    `name` VARCHAR(100) NOT NULL,
    `age` INT NOT NULL,
    `gender` ENUM('male', 'female', 'other') NOT NULL,
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `address` TEXT,
    `id_card` VARCHAR(20),
    `emergency_contact` VARCHAR(100),
    `emergency_phone` VARCHAR(20),
    `medical_history` JSON,
    `allergies` JSON,
    `blood_type` VARCHAR(10),
    `height` DECIMAL(5,2),
    `weight` DECIMAL(5,2),
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `deleted_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_id_card` (`id_card`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建医学影像表
CREATE TABLE IF NOT EXISTS `medical_images` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(36) NOT NULL,
    `study_id` VARCHAR(100),
    `series_id` VARCHAR(100),
    `instance_id` VARCHAR(100),
    `modality` VARCHAR(10) NOT NULL,
    `body_part` VARCHAR(50),
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT,
    `file_format` VARCHAR(10),
    `acquisition_date` DATE,
    `acquisition_time` TIME,
    `metadata` JSON,
    `status` ENUM('uploaded', 'processing', 'processed', 'failed') DEFAULT 'uploaded',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_study_id` (`study_id`),
    INDEX `idx_modality` (`modality`),
    INDEX `idx_acquisition_date` (`acquisition_date`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建诊断报告表
CREATE TABLE IF NOT EXISTS `diagnosis_reports` (
    `id` VARCHAR(36) PRIMARY KEY,
    `patient_id` VARCHAR(36) NOT NULL,
    `image_id` VARCHAR(36),
    `doctor_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `findings` TEXT,
    `impression` TEXT,
    `recommendations` TEXT,
    `status` ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft',
    `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    `report_date` DATE NOT NULL,
    `approved_by` VARCHAR(36),
    `approved_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`image_id`) REFERENCES `medical_images`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`),
    INDEX `idx_patient_id` (`patient_id`),
    INDEX `idx_doctor_id` (`doctor_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_report_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(100) UNIQUE NOT NULL,
    `config_value` TEXT,
    `description` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_config_key` (`config_key`)
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

-- 插入默认系统配置
INSERT INTO `system_config` (`config_key`, `config_value`, `description`) VALUES
('system_name', '医疗影像诊断系统', '系统名称'),
('version', '1.0.0', '系统版本'),
('max_upload_size', '100', '最大上传文件大小(MB)'),
('allowed_file_types', 'dcm,dicom,jpg,jpeg,png', '允许的文件类型'),
('session_timeout', '3600', '会话超时时间(秒)'),
('backup_enabled', '1', '是否启用自动备份'),
('backup_schedule', '0 2 * * *', '备份计划(Cron表达式)')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);

-- 创建默认管理员用户 (密码: admin123)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`) VALUES
('admin-user-id-001', 'admin', 'admin@medical-system.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyV8Eim', '系统管理员', 'admin')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 显示创建的表
SHOW TABLES;

-- 显示表结构
DESCRIBE users;
DESCRIBE patients;
DESCRIBE medical_images;
DESCRIBE diagnosis_reports;
