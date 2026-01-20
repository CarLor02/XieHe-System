-- 添加image_file_id字段到image_annotations和ai_tasks表
-- 这是数据模型简化重构的第一步

-- 1. 为image_annotations表添加image_file_id字段
ALTER TABLE image_annotations 
ADD COLUMN image_file_id INT NULL COMMENT '关联的影像文件ID（新模式）' AFTER instance_id,
ADD INDEX idx_image_annotations_image_file_id (image_file_id);

-- 2. 为ai_tasks表添加image_file_id字段
ALTER TABLE ai_tasks 
ADD COLUMN image_file_id INT NULL COMMENT '关联的影像文件ID（新模式）' AFTER study_id,
ADD INDEX idx_ai_tasks_image_file_id (image_file_id);

-- 3. 添加外键约束（可选，如果需要的话）
-- ALTER TABLE image_annotations 
-- ADD CONSTRAINT fk_image_annotations_image_file 
-- FOREIGN KEY (image_file_id) REFERENCES image_files(id) ON DELETE SET NULL;

-- ALTER TABLE ai_tasks 
-- ADD CONSTRAINT fk_ai_tasks_image_file 
-- FOREIGN KEY (image_file_id) REFERENCES image_files(id) ON DELETE SET NULL;

-- 验证
SELECT 'image_annotations表结构:' AS info;
DESCRIBE image_annotations;

SELECT 'ai_tasks表结构:' AS info;
DESCRIBE ai_tasks;


