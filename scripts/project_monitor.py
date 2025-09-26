#!/usr/bin/env python3
"""
项目状态监控脚本
监控项目进度变化，发送通知和警报
"""

import os
import json
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from progress_tracker import ProgressTracker

class ProjectMonitor:
    """项目状态监控器"""
    
    def __init__(self):
        self.tracker = ProgressTracker()
        self.history_file = "project_history.json"
        self.config_file = "monitor_config.json"
        self.load_config()
    
    def load_config(self):
        """加载监控配置"""
        default_config = {
            "email": {
                "enabled": False,
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "username": "",
                "password": "",
                "recipients": []
            },
            "thresholds": {
                "progress_warning": 10.0,  # 进度低于10%时警告
                "deadline_warning_days": 7,  # 距离截止日期7天时警告
                "task_overdue_days": 3  # 任务超期3天时警告
            },
            "notifications": {
                "daily_report": True,
                "milestone_alerts": True,
                "risk_alerts": True
            }
        }
        
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """保存监控配置"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def load_history(self):
        """加载历史数据"""
        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"snapshots": []}
    
    def save_history(self, history):
        """保存历史数据"""
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    
    def take_snapshot(self):
        """创建当前状态快照"""
        stats = self.tracker.get_project_stats()
        stage_stats = self.tracker.get_stage_stats()
        
        snapshot = {
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "total_tasks": stats.total_tasks,
                "completed_tasks": stats.completed_tasks,
                "in_progress_tasks": stats.in_progress_tasks,
                "not_started_tasks": stats.not_started_tasks,
                "completion_rate": stats.completion_rate
            },
            "stage_stats": stage_stats
        }
        
        history = self.load_history()
        history["snapshots"].append(snapshot)
        
        # 只保留最近30天的快照
        cutoff_date = datetime.now() - timedelta(days=30)
        history["snapshots"] = [
            s for s in history["snapshots"] 
            if datetime.fromisoformat(s["timestamp"]) > cutoff_date
        ]
        
        self.save_history(history)
        return snapshot
    
    def detect_changes(self):
        """检测进度变化"""
        history = self.load_history()
        if len(history["snapshots"]) < 2:
            return None
        
        current = history["snapshots"][-1]
        previous = history["snapshots"][-2]
        
        changes = {
            "completed_tasks_change": current["stats"]["completed_tasks"] - previous["stats"]["completed_tasks"],
            "completion_rate_change": current["stats"]["completion_rate"] - previous["stats"]["completion_rate"],
            "timestamp": current["timestamp"]
        }
        
        return changes
    
    def check_risks(self):
        """检查项目风险"""
        stats = self.tracker.get_project_stats()
        risks = []
        
        # 进度风险
        if stats.completion_rate < self.config["thresholds"]["progress_warning"]:
            risks.append({
                "type": "进度风险",
                "level": "高",
                "message": f"项目完成率仅为 {stats.completion_rate:.1f}%，低于警告阈值"
            })
        
        # 截止日期风险
        if stats.days_remaining <= self.config["thresholds"]["deadline_warning_days"]:
            risks.append({
                "type": "截止日期风险",
                "level": "中",
                "message": f"距离预计完成日期仅剩 {stats.days_remaining} 天"
            })
        
        return risks
    
    def generate_daily_report(self):
        """生成每日报告"""
        stats = self.tracker.get_project_stats()
        changes = self.detect_changes()
        risks = self.check_risks()
        
        report = f"""
# 📊 每日项目进度报告

**日期**: {datetime.now().strftime("%Y-%m-%d")}

## 📈 当前状态
- **总体进度**: {stats.completion_rate:.1f}% ({stats.completed_tasks}/{stats.total_tasks})
- **进行中任务**: {stats.in_progress_tasks} 个
- **预计完成**: {stats.estimated_completion_date}

"""
        
        if changes:
            report += f"""## 📊 今日变化
- **新完成任务**: {changes['completed_tasks_change']} 个
- **进度提升**: {changes['completion_rate_change']:.1f}%

"""
        
        if risks:
            report += "## ⚠️ 风险警报\n"
            for risk in risks:
                report += f"- **{risk['type']}** ({risk['level']}): {risk['message']}\n"
            report += "\n"
        
        # 添加下一步计划
        in_progress_tasks = [t for t in self.tracker.tasks if t.status == "🔄"]
        if in_progress_tasks:
            report += "## 🔄 进行中的任务\n"
            for task in in_progress_tasks:
                report += f"- {task.name}\n"
        
        return report
    
    def send_email_notification(self, subject: str, content: str):
        """发送邮件通知"""
        if not self.config["email"]["enabled"]:
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.config["email"]["username"]
            msg['Subject'] = subject
            
            msg.attach(MIMEText(content, 'plain', 'utf-8'))
            
            server = smtplib.SMTP(self.config["email"]["smtp_server"], self.config["email"]["smtp_port"])
            server.starttls()
            server.login(self.config["email"]["username"], self.config["email"]["password"])
            
            for recipient in self.config["email"]["recipients"]:
                msg['To'] = recipient
                server.send_message(msg)
                del msg['To']
            
            server.quit()
            return True
            
        except Exception as e:
            print(f"❌ 邮件发送失败: {e}")
            return False
    
    def run_daily_check(self):
        """执行每日检查"""
        print("🔍 执行每日项目检查...")
        
        # 创建快照
        snapshot = self.take_snapshot()
        print(f"📸 已创建状态快照: {snapshot['timestamp']}")
        
        # 检测变化
        changes = self.detect_changes()
        if changes:
            print(f"📊 检测到进度变化: +{changes['completed_tasks_change']} 个任务完成")
        
        # 检查风险
        risks = self.check_risks()
        if risks:
            print(f"⚠️  检测到 {len(risks)} 个风险项")
            for risk in risks:
                print(f"   - {risk['type']}: {risk['message']}")
        
        # 生成报告
        if self.config["notifications"]["daily_report"]:
            report = self.generate_daily_report()
            
            # 保存报告到文件
            report_file = f"daily_report_{datetime.now().strftime('%Y%m%d')}.md"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"📄 每日报告已保存: {report_file}")
            
            # 发送邮件通知
            if self.config["email"]["enabled"]:
                subject = f"项目进度日报 - {datetime.now().strftime('%Y-%m-%d')}"
                if self.send_email_notification(subject, report):
                    print("📧 邮件通知已发送")
        
        print("✅ 每日检查完成")
    
    def setup_email(self, smtp_server: str, smtp_port: int, username: str, password: str, recipients: list):
        """配置邮件通知"""
        self.config["email"] = {
            "enabled": True,
            "smtp_server": smtp_server,
            "smtp_port": smtp_port,
            "username": username,
            "password": password,
            "recipients": recipients
        }
        self.save_config()
        print("✅ 邮件配置已保存")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="项目状态监控")
    parser.add_argument("--daily", action="store_true", help="执行每日检查")
    parser.add_argument("--setup-email", action="store_true", help="配置邮件通知")
    parser.add_argument("--test-email", action="store_true", help="测试邮件发送")
    
    args = parser.parse_args()
    
    monitor = ProjectMonitor()
    
    if args.daily:
        monitor.run_daily_check()
    elif args.setup_email:
        print("📧 配置邮件通知...")
        smtp_server = input("SMTP服务器: ")
        smtp_port = int(input("SMTP端口: "))
        username = input("用户名: ")
        password = input("密码: ")
        recipients = input("收件人(用逗号分隔): ").split(",")
        recipients = [r.strip() for r in recipients]
        
        monitor.setup_email(smtp_server, smtp_port, username, password, recipients)
    elif args.test_email:
        test_content = "这是一封测试邮件，用于验证邮件通知功能是否正常工作。"
        if monitor.send_email_notification("测试邮件", test_content):
            print("✅ 测试邮件发送成功")
        else:
            print("❌ 测试邮件发送失败")
    else:
        # 默认显示当前状态
        stats = monitor.tracker.get_project_stats()
        print(f"📊 项目状态: {stats.completion_rate:.1f}% 完成")
        
        risks = monitor.check_risks()
        if risks:
            print(f"⚠️  当前风险: {len(risks)} 项")
            for risk in risks:
                print(f"   - {risk['message']}")
        else:
            print("✅ 当前无风险")

if __name__ == "__main__":
    main()
