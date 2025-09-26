#!/usr/bin/env python3
"""
任务状态更新脚本
用于更新项目进度文档中的任务状态

使用方法:
python scripts/update_task_status.py <task_id> <status> [test_status] [completion_date] [notes]

参数说明:
- task_id: 任务ID (必需)
- status: 任务状态 (必需) - NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
- test_status: 测试状态 (可选) - TESTING, TEST_PASSED, TEST_FAILED
- completion_date: 完成日期 (可选) - 格式: YYYY-MM-DD
- notes: 备注信息 (可选)

示例:
python scripts/update_task_status.py hBx19u6Pgd8yb2QMuuXP2V COMPLETED TEST_PASSED 2025-09-25 "编码规范文档已完成"
"""

import sys
import re
from datetime import datetime
from pathlib import Path

# 状态映射
STATUS_MAPPING = {
    'NOT_STARTED': '⏳',
    'IN_PROGRESS': '🔄', 
    'COMPLETED': '✅',
    'CANCELLED': '❌',
    'TESTING': '🧪',
    'TEST_PASSED': '✅🧪',
    'TEST_FAILED': '❌🧪'
}

def update_task_status(task_id, status, test_status=None, completion_date=None, notes=None):
    """更新任务状态"""
    
    # 验证状态
    if status not in STATUS_MAPPING:
        print(f"错误: 无效的状态 '{status}'")
        print(f"有效状态: {', '.join(STATUS_MAPPING.keys())}")
        return False
    
    if test_status and test_status not in STATUS_MAPPING:
        print(f"错误: 无效的测试状态 '{test_status}'")
        print(f"有效测试状态: TESTING, TEST_PASSED, TEST_FAILED")
        return False
    
    # 读取项目进度文档
    progress_file = Path("docs/project-progress.md")
    if not progress_file.exists():
        print("错误: 找不到项目进度文档 docs/project-progress.md")
        return False
    
    content = progress_file.read_text(encoding='utf-8')
    
    # 查找任务行
    pattern = rf'\| {re.escape(task_id)} \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|'
    match = re.search(pattern, content)
    
    if not match:
        print(f"错误: 找不到任务ID '{task_id}'")
        return False
    
    # 构建新的状态
    status_icon = STATUS_MAPPING[status]
    test_status_display = STATUS_MAPPING[test_status] if test_status else '-'
    completion_date_display = completion_date if completion_date else '-'
    notes_display = notes if notes else match.group(5).strip()
    
    # 构建新的行
    task_name = match.group(1).strip()
    new_line = f"| {task_id} | {task_name} | {status_icon} | {test_status_display} | {completion_date_display} | {notes_display} |"
    
    # 替换内容
    new_content = content.replace(match.group(0), new_line)
    
    # 写回文件
    progress_file.write_text(new_content, encoding='utf-8')
    
    print(f"✅ 任务 {task_id} 状态已更新:")
    print(f"   状态: {status} ({status_icon})")
    if test_status:
        print(f"   测试状态: {test_status} ({test_status_display})")
    if completion_date:
        print(f"   完成日期: {completion_date}")
    if notes:
        print(f"   备注: {notes}")
    
    return True

def show_usage():
    """显示使用说明"""
    print(__doc__)

def main():
    """主函数"""
    if len(sys.argv) < 3:
        show_usage()
        return
    
    task_id = sys.argv[1]
    status = sys.argv[2]
    test_status = sys.argv[3] if len(sys.argv) > 3 else None
    completion_date = sys.argv[4] if len(sys.argv) > 4 else None
    notes = sys.argv[5] if len(sys.argv) > 5 else None
    
    # 如果没有提供完成日期但状态是COMPLETED，自动使用今天的日期
    if status == 'COMPLETED' and not completion_date:
        completion_date = datetime.now().strftime('%Y-%m-%d')
    
    success = update_task_status(task_id, status, test_status, completion_date, notes)
    
    if success:
        print("\n💡 提示: 记得更新任务统计概览表中的数据")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
