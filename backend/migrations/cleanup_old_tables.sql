-- ============================================
-- 数据模型清理脚本 - 删除废弃的表和字段
-- ============================================
-- 
-- 警告：此脚本会永久删除数据！
-- 执行前请确保：
-- 1. 已经完成数据迁移（migrate_to_simplified_model.py）
-- 2. 已经备份数据库
-- 3. 已经验证新模型工作正常
--
-- 作者: XieHe Medical System
-- 创建时间: 2026-01-14
-- ============================================

-- 禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 第一步：删除废弃的字段
-- ============================================

-- 1. 从 image_files 表删除 study_id 和 series_id
ALTER TABLE image_files 
DROP COLUMN IF EXISTS study_id,
DROP COLUMN IF EXISTS series_id;

-- 2. 从 image_annotations 表删除 study_id 和 instance_id
ALTER TABLE image_annotations 
DROP COLUMN IF EXISTS study_id,
DROP COLUMN IF EXISTS instance_id;

-- 3. 从 ai_tasks 表删除 study_id
ALTER TABLE ai_tasks 
DROP COLUMN IF EXISTS study_id;

-- ============================================
-- 第二步：删除废弃的表
-- ============================================

-- 按依赖关系倒序删除表
DROP TABLE IF EXISTS instances;
DROP TABLE IF EXISTS series;
DROP TABLE IF EXISTS studies;

-- ============================================
-- 第三步：验证清理结果
-- ============================================

-- 显示剩余的表
SELECT 'Database tables after cleanup:' AS info;
SHOW TABLES;

-- 显示 image_files 表结构
SELECT 'image_files table structure:' AS info;
DESCRIBE image_files;

-- 显示 image_annotations 表结构
SELECT 'image_annotations table structure:' AS info;
DESCRIBE image_annotations;

-- 显示 ai_tasks 表结构
SELECT 'ai_tasks table structure:' AS info;
DESCRIBE ai_tasks;

-- 启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 完成
-- ============================================
SELECT 'Cleanup completed successfully!' AS status;

