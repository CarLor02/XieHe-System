#!/usr/bin/env python3
"""
项目进度跟踪工具
用于生成项目进度报告、统计分析、风险评估等
"""

import re
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict

@dataclass
class Task:
    """任务数据类"""
    id: str
    name: str
    status: str
    test_status: str
    completion_date: str
    description: str
    stage: int = 0
    priority: str = "中"
    estimated_hours: int = 1
    actual_hours: int = 0
    assignee: str = ""
    dependencies: List[str] = None

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class ProjectStats:
    """项目统计数据类"""
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    not_started_tasks: int
    completion_rate: float
    estimated_completion_date: str
    days_remaining: int

class ProgressTracker:
    """项目进度跟踪器"""
    
    def __init__(self, progress_file: str = "docs/project-progress.md"):
        self.progress_file = progress_file
        self.tasks: List[Task] = []
        self.stages = {
            1: "项目规范与架构设计",
            2: "基础环境搭建", 
            3: "核心功能模块开发",
            4: "系统集成与优化",
            5: "测试与部署",
            6: "文档与验收"
        }
        self.load_tasks()
    
    def load_tasks(self):
        """从进度文档加载任务数据"""
        try:
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 解析任务表格
            task_pattern = r'\| ([a-zA-Z0-9]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|'
            matches = re.findall(task_pattern, content)
            
            current_stage = 0
            for match in matches:
                task_id, name, status, test_status, completion_date, description = match
                task_id = task_id.strip()
                name = name.strip()
                status = status.strip()
                test_status = test_status.strip()
                completion_date = completion_date.strip()
                description = description.strip()
                
                # 跳过表头
                if task_id == "任务 ID" or task_id == "----------------------":
                    continue
                
                # 检测阶段
                stage_match = re.search(r'第(\d+)阶段', content[:content.find(task_id)])
                if stage_match:
                    current_stage = int(stage_match.group(1))
                
                task = Task(
                    id=task_id,
                    name=name,
                    status=status,
                    test_status=test_status,
                    completion_date=completion_date,
                    description=description,
                    stage=current_stage
                )
                self.tasks.append(task)
                
        except FileNotFoundError:
            print(f"❌ 找不到进度文件: {self.progress_file}")
        except Exception as e:
            print(f"❌ 加载任务数据失败: {e}")
    
    def get_project_stats(self) -> ProjectStats:
        """获取项目统计数据"""
        total = len(self.tasks)
        completed = len([t for t in self.tasks if t.status == "✅"])
        in_progress = len([t for t in self.tasks if t.status == "🔄"])
        not_started = len([t for t in self.tasks if t.status == "⏳"])
        
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        # 估算完成日期（基于当前进度）
        if completion_rate > 0:
            days_passed = 1  # 假设已经过了1天
            total_days_estimated = days_passed / (completion_rate / 100)
            remaining_days = int(total_days_estimated - days_passed)
            estimated_completion = datetime.now() + timedelta(days=remaining_days)
            estimated_completion_str = estimated_completion.strftime("%Y-%m-%d")
        else:
            remaining_days = 0
            estimated_completion_str = "待评估"
        
        return ProjectStats(
            total_tasks=total,
            completed_tasks=completed,
            in_progress_tasks=in_progress,
            not_started_tasks=not_started,
            completion_rate=completion_rate,
            estimated_completion_date=estimated_completion_str,
            days_remaining=remaining_days
        )
    
    def get_stage_stats(self) -> Dict[int, Dict]:
        """获取各阶段统计数据"""
        stage_stats = {}
        
        for stage_num, stage_name in self.stages.items():
            stage_tasks = [t for t in self.tasks if t.stage == stage_num]
            total = len(stage_tasks)
            completed = len([t for t in stage_tasks if t.status == "✅"])
            in_progress = len([t for t in stage_tasks if t.status == "🔄"])
            not_started = len([t for t in stage_tasks if t.status == "⏳"])
            
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            stage_stats[stage_num] = {
                "name": stage_name,
                "total": total,
                "completed": completed,
                "in_progress": in_progress,
                "not_started": not_started,
                "completion_rate": completion_rate
            }
        
        return stage_stats
    
    def generate_progress_report(self) -> str:
        """生成进度报告"""
        stats = self.get_project_stats()
        stage_stats = self.get_stage_stats()
        
        report = f"""
# 📊 项目进度报告

**生成时间**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## 📈 总体进度

- **总任务数**: {stats.total_tasks} 个
- **已完成**: {stats.completed_tasks} 个 ({stats.completion_rate:.1f}%)
- **进行中**: {stats.in_progress_tasks} 个
- **待开始**: {stats.not_started_tasks} 个
- **预计完成日期**: {stats.estimated_completion_date}
- **剩余天数**: {stats.days_remaining} 天

## 📊 各阶段进度

| 阶段 | 任务数 | 已完成 | 进行中 | 待开始 | 完成率 |
|------|--------|--------|--------|--------|--------|"""

        for stage_num, data in stage_stats.items():
            report += f"\n| 第{stage_num}阶段：{data['name']} | {data['total']} | {data['completed']} | {data['in_progress']} | {data['not_started']} | {data['completion_rate']:.1f}% |"

        # 添加最近完成的任务
        recent_completed = [t for t in self.tasks if t.status == "✅" and t.completion_date != "-"]
        if recent_completed:
            report += "\n\n## ✅ 最近完成的任务\n\n"
            for task in recent_completed[-5:]:  # 显示最近5个
                report += f"- **{task.name}** ({task.completion_date}) - {task.test_status}\n"

        # 添加进行中的任务
        in_progress_tasks = [t for t in self.tasks if t.status == "🔄"]
        if in_progress_tasks:
            report += "\n\n## 🔄 进行中的任务\n\n"
            for task in in_progress_tasks:
                report += f"- **{task.name}** - {task.description}\n"

        return report
    
    def generate_milestone_report(self) -> str:
        """生成里程碑报告"""
        stage_stats = self.get_stage_stats()
        
        report = "\n# 🎯 里程碑进度\n\n"
        report += "| 里程碑 | 计划日期 | 完成率 | 状态 |\n"
        report += "|--------|----------|--------|------|\n"
        
        for stage_num, data in stage_stats.items():
            # 估算里程碑日期
            base_date = datetime(2025, 9, 24)
            milestone_date = base_date + timedelta(days=stage_num * 14)  # 每阶段2周
            
            if data['completion_rate'] == 100:
                status = "✅ 已完成"
            elif data['completion_rate'] > 0:
                status = "🔄 进行中"
            else:
                status = "⏳ 待开始"
            
            report += f"| 第{stage_num}阶段：{data['name']} | {milestone_date.strftime('%Y-%m-%d')} | {data['completion_rate']:.1f}% | {status} |\n"
        
        return report
    
    def generate_risk_assessment(self) -> str:
        """生成风险评估报告"""
        stats = self.get_project_stats()
        
        risks = []
        
        # 进度风险评估
        if stats.completion_rate < 10 and stats.days_remaining < 30:
            risks.append({
                "level": "🔴 高风险",
                "type": "进度风险",
                "description": "项目进度严重滞后，可能无法按期完成",
                "impact": "项目延期",
                "mitigation": "增加资源投入，优化任务优先级"
            })
        elif stats.completion_rate < 50 and stats.days_remaining < 60:
            risks.append({
                "level": "🟡 中风险", 
                "type": "进度风险",
                "description": "项目进度略有滞后",
                "impact": "可能延期1-2周",
                "mitigation": "加强进度监控，及时调整计划"
            })
        
        # 质量风险评估
        test_failed_tasks = [t for t in self.tasks if "❌" in t.test_status]
        if test_failed_tasks:
            risks.append({
                "level": "🟡 中风险",
                "type": "质量风险", 
                "description": f"有{len(test_failed_tasks)}个任务测试失败",
                "impact": "影响系统质量",
                "mitigation": "重新测试和修复问题"
            })
        
        if not risks:
            return "\n# ⚠️ 风险评估\n\n✅ 当前无重大风险\n"
        
        report = "\n# ⚠️ 风险评估\n\n"
        report += "| 风险等级 | 风险类型 | 风险描述 | 影响 | 缓解措施 |\n"
        report += "|----------|----------|----------|------|----------|\n"
        
        for risk in risks:
            report += f"| {risk['level']} | {risk['type']} | {risk['description']} | {risk['impact']} | {risk['mitigation']} |\n"
        
        return report
    
    def export_to_json(self, filename: str = "project_progress.json"):
        """导出数据到JSON文件"""
        data = {
            "export_time": datetime.now().isoformat(),
            "project_stats": asdict(self.get_project_stats()),
            "stage_stats": self.get_stage_stats(),
            "tasks": [asdict(task) for task in self.tasks]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 数据已导出到 {filename}")

def main():
    parser = argparse.ArgumentParser(description="项目进度跟踪工具")
    parser.add_argument("--report", action="store_true", help="生成进度报告")
    parser.add_argument("--milestone", action="store_true", help="生成里程碑报告")
    parser.add_argument("--risk", action="store_true", help="生成风险评估")
    parser.add_argument("--export", help="导出数据到JSON文件")
    parser.add_argument("--full", action="store_true", help="生成完整报告")
    
    args = parser.parse_args()
    
    tracker = ProgressTracker()
    
    if args.report or args.full:
        print(tracker.generate_progress_report())
    
    if args.milestone or args.full:
        print(tracker.generate_milestone_report())
    
    if args.risk or args.full:
        print(tracker.generate_risk_assessment())
    
    if args.export:
        tracker.export_to_json(args.export)
    
    if not any([args.report, args.milestone, args.risk, args.export, args.full]):
        # 默认显示简要统计
        stats = tracker.get_project_stats()
        print(f"📊 项目进度: {stats.completion_rate:.1f}% ({stats.completed_tasks}/{stats.total_tasks})")
        print(f"🔄 进行中: {stats.in_progress_tasks} 个任务")
        print(f"📅 预计完成: {stats.estimated_completion_date}")

if __name__ == "__main__":
    main()
