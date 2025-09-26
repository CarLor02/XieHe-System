-- 医疗影像诊断系统 - 用户创建脚本
-- 创建应用用户和权限配置

-- 创建应用用户
CREATE USER IF NOT EXISTS 'medical_user'@'%' IDENTIFIED BY 'medical_password_2024';

-- 授予主数据库权限
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES 
ON `medical_system`.* TO 'medical_user'@'%';

-- 授予测试数据库权限
GRANT ALL PRIVILEGES ON `medical_system_test`.* TO 'medical_user'@'%';

-- 创建只读用户（用于报表和分析）
CREATE USER IF NOT EXISTS 'medical_readonly'@'%' IDENTIFIED BY 'readonly_password_2024';
GRANT SELECT ON `medical_system`.* TO 'medical_readonly'@'%';

-- 创建备份用户
CREATE USER IF NOT EXISTS 'medical_backup'@'%' IDENTIFIED BY 'backup_password_2024';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON `medical_system`.* TO 'medical_backup'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示用户列表
SELECT User, Host FROM mysql.user WHERE User LIKE 'medical_%';
