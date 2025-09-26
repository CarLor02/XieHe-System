#!/usr/bin/env python3
"""
任务查询脚本
用于查询项目进度文档中的任务信息

使用方法:
python scripts/query_tasks.py [options]

选项:
--task-id <id>        查询特定任务ID
--status <status>     查询特定状态的任务
--stage <stage>       查询特定阶段的任务 (1-6)
--summary            显示任务统计摘要
--help               显示帮助信息

示例:
python scripts/query_tasks.py --task-id hBx19u6Pgd8yb2QMuuXP2V
python scripts/query_tasks.py --status IN_PROGRESS
python scripts/query_tasks.py --stage 1
python scripts/query_tasks.py --summary
"""

import sys
import re
import argparse
from pathlib import Path
from collections import defaultdict

# 状态映射
STATUS_ICONS = {
    '⏳': 'NOT_STARTED',
    '🔄': 'IN_PROGRESS', 
    '✅': 'COMPLETED',
    '❌': 'CANCELLED',
    '🧪': 'TESTING',
    '✅🧪': 'TEST_PASSED',
    '❌🧪': 'TEST_FAILED'
}

STAGE_NAMES = {
    1: "第一阶段：项目规范与架构设计",
    2: "第二阶段：基础环境搭建", 
    3: "第三阶段：核心功能模块开发",
    4: "第四阶段：系统集成与优化",
    5: "第五阶段：测试与部署",
    6: "第六阶段：文档与验收"
}

def parse_tasks_from_file():
    """从项目进度文档中解析任务信息"""
    progress_file = Path("docs/project-progress.md")
    if not progress_file.exists():
        print("错误: 找不到项目进度文档 docs/project-progress.md")
        return []
    
    content = progress_file.read_text(encoding='utf-8')
    
    # 解析任务表格
    tasks = []
    current_stage = 0
    current_section = ""
    
    lines = content.split('\n')
    for line in lines:
        # 检测阶段标题
        if line.startswith('## 第') and '阶段' in line:
            stage_match = re.search(r'第(\d+)阶段', line)
            if stage_match:
                current_stage = int(stage_match.group(1))
        
        # 检测子模块标题
        if line.startswith('### '):
            current_section = line.replace('### ', '').strip()
        
        # 解析任务行
        if line.startswith('| ') and ' | ' in line and not line.startswith('| 任务ID'):
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) >= 6:
                task = {
                    'id': parts[0],
                    'name': parts[1],
                    'status_icon': parts[2],
                    'status': STATUS_ICONS.get(parts[2], 'UNKNOWN'),
                    'test_status_icon': parts[3],
                    'test_status': STATUS_ICONS.get(parts[3], 'NONE') if parts[3] != '-' else 'NONE',
                    'completion_date': parts[4] if parts[4] != '-' else None,
                    'notes': parts[5],
                    'stage': current_stage,
                    'section': current_section
                }
                tasks.append(task)
    
    return tasks

def query_task_by_id(tasks, task_id):
    """根据任务ID查询任务"""
    for task in tasks:
        if task['id'] == task_id:
            return task
    return None

def query_tasks_by_status(tasks, status):
    """根据状态查询任务"""
    return [task for task in tasks if task['status'] == status]

def query_tasks_by_stage(tasks, stage):
    """根据阶段查询任务"""
    return [task for task in tasks if task['stage'] == stage]

def print_task_detail(task):
    """打印任务详情"""
    print(f"📋 任务详情:")
    print(f"   ID: {task['id']}")
    print(f"   名称: {task['name']}")
    print(f"   状态: {task['status']} ({task['status_icon']})")
    print(f"   测试状态: {task['test_status']} ({task['test_status_icon']})")
    print(f"   完成日期: {task['completion_date'] or '未完成'}")
    stage_name = STAGE_NAMES.get(task['stage'], f"第{task['stage']}阶段")
    print(f"   阶段: {stage_name}")
    print(f"   模块: {task['section']}")
    print(f"   备注: {task['notes']}")

def print_task_list(tasks, title="任务列表"):
    """打印任务列表"""
    if not tasks:
        print(f"📋 {title}: 无匹配任务")
        return
    
    print(f"📋 {title} ({len(tasks)}个任务):")
    print(f"{'ID':<25} {'名称':<30} {'状态':<10} {'阶段':<5}")
    print("-" * 80)
    
    for task in tasks:
        stage_name = f"第{task['stage']}阶段"
        print(f"{task['id']:<25} {task['name'][:28]:<30} {task['status_icon']:<10} {stage_name:<5}")

def print_summary(tasks):
    """打印任务统计摘要"""
    if not tasks:
        print("📊 任务统计: 无任务数据")
        return
    
    # 按状态统计
    status_count = defaultdict(int)
    for task in tasks:
        status_count[task['status']] += 1
    
    # 按阶段统计
    stage_count = defaultdict(lambda: defaultdict(int))
    for task in tasks:
        stage_count[task['stage']][task['status']] += 1
    
    print("📊 任务统计摘要:")
    print(f"   总任务数: {len(tasks)}")
    print()
    
    print("📈 按状态统计:")
    for status, count in status_count.items():
        icon = next((k for k, v in STATUS_ICONS.items() if v == status), '❓')
        percentage = (count / len(tasks)) * 100
        print(f"   {status} ({icon}): {count}个 ({percentage:.1f}%)")
    print()
    
    print("📊 按阶段统计:")
    for stage in sorted(stage_count.keys()):
        stage_name = STAGE_NAMES.get(stage, f"第{stage}阶段")
        stage_tasks = sum(stage_count[stage].values())
        completed = stage_count[stage]['COMPLETED']
        percentage = (completed / stage_tasks) * 100 if stage_tasks > 0 else 0
        print(f"   {stage_name}: {completed}/{stage_tasks} ({percentage:.1f}%)")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='查询项目任务信息')
    parser.add_argument('--task-id', help='查询特定任务ID')
    parser.add_argument('--status', help='查询特定状态的任务')
    parser.add_argument('--stage', type=int, choices=[1,2,3,4,5,6], help='查询特定阶段的任务')
    parser.add_argument('--summary', action='store_true', help='显示任务统计摘要')
    
    args = parser.parse_args()
    
    # 如果没有参数，显示帮助
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    # 解析任务数据
    tasks = parse_tasks_from_file()
    if not tasks:
        return
    
    # 根据参数执行查询
    if args.task_id:
        task = query_task_by_id(tasks, args.task_id)
        if task:
            print_task_detail(task)
        else:
            print(f"❌ 找不到任务ID: {args.task_id}")
    
    elif args.status:
        status = args.status.upper()
        matching_tasks = query_tasks_by_status(tasks, status)
        print_task_list(matching_tasks, f"状态为 {status} 的任务")
    
    elif args.stage:
        matching_tasks = query_tasks_by_stage(tasks, args.stage)
        stage_name = STAGE_NAMES.get(args.stage, f"第{args.stage}阶段")
        print_task_list(matching_tasks, f"{stage_name}的任务")
    
    elif args.summary:
        print_summary(tasks)

if __name__ == "__main__":
    main()
