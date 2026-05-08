-- 医疗影像诊断系统 - 数据库初始化脚本
-- 创建数据库和基础配置

-- 创建主数据库
CREATE DATABASE IF NOT EXISTS `medical_system` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS `medical_system_test` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- 设置默认字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 显示创建的数据库
SHOW DATABASES LIKE 'medical_system%';
