#!/usr/bin/env python3
"""
项目仪表板生成器
生成HTML格式的项目进度仪表板
"""

import json
from datetime import datetime
from progress_tracker import ProgressTracker

class DashboardGenerator:
    """项目仪表板生成器"""
    
    def __init__(self):
        self.tracker = ProgressTracker()
    
    def generate_html_dashboard(self) -> str:
        """生成HTML仪表板"""
        stats = self.tracker.get_project_stats()
        stage_stats = self.tracker.get_stage_stats()
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>医疗影像诊断系统 - 项目仪表板</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header p {{
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }}
        
        .stat-card {{
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            border-left: 5px solid;
            transition: transform 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
        }}
        
        .stat-card.total {{ border-left-color: #6c757d; }}
        .stat-card.completed {{ border-left-color: #28a745; }}
        .stat-card.progress {{ border-left-color: #ffc107; }}
        .stat-card.pending {{ border-left-color: #dc3545; }}
        
        .stat-number {{
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        
        .stat-label {{
            font-size: 1.1em;
            color: #6c757d;
        }}
        
        .progress-bar {{
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.5s ease;
        }}
        
        .stages-section {{
            padding: 30px;
            background: #f8f9fa;
        }}
        
        .section-title {{
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #495057;
        }}
        
        .stage-card {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        .stage-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }}
        
        .stage-name {{
            font-size: 1.2em;
            font-weight: bold;
            color: #495057;
        }}
        
        .stage-progress {{
            font-size: 1.1em;
            color: #28a745;
            font-weight: bold;
        }}
        
        .stage-stats {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            text-align: center;
        }}
        
        .stage-stat {{
            padding: 10px;
            border-radius: 8px;
            background: #f8f9fa;
        }}
        
        .stage-stat-number {{
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        
        .stage-stat-label {{
            font-size: 0.9em;
            color: #6c757d;
        }}
        
        .footer {{
            padding: 20px 30px;
            background: #495057;
            color: white;
            text-align: center;
        }}
        
        .update-time {{
            opacity: 0.8;
        }}
        
        @media (max-width: 768px) {{
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            .stage-stats {{
                grid-template-columns: repeat(2, 1fr);
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 医疗影像诊断系统</h1>
            <p>项目进度仪表板</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-number">{stats.total_tasks}</div>
                <div class="stat-label">总任务数</div>
            </div>
            
            <div class="stat-card completed">
                <div class="stat-number">{stats.completed_tasks}</div>
                <div class="stat-label">已完成</div>
            </div>
            
            <div class="stat-card progress">
                <div class="stat-number">{stats.in_progress_tasks}</div>
                <div class="stat-label">进行中</div>
            </div>
            
            <div class="stat-card pending">
                <div class="stat-number">{stats.not_started_tasks}</div>
                <div class="stat-label">待开始</div>
            </div>
        </div>
        
        <div style="padding: 0 30px;">
            <h2 class="section-title">📈 总体进度</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {stats.completion_rate}%"></div>
            </div>
            <p style="text-align: center; font-size: 1.2em; color: #495057;">
                <strong>{stats.completion_rate:.1f}%</strong> 完成 
                | 预计完成日期: <strong>{stats.estimated_completion_date}</strong>
            </p>
        </div>
        
        <div class="stages-section">
            <h2 class="section-title">🎯 各阶段进度</h2>
"""
        
        for stage_num, data in stage_stats.items():
            html += f"""
            <div class="stage-card">
                <div class="stage-header">
                    <div class="stage-name">第{stage_num}阶段：{data['name']}</div>
                    <div class="stage-progress">{data['completion_rate']:.1f}%</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {data['completion_rate']}%"></div>
                </div>
                <div class="stage-stats">
                    <div class="stage-stat">
                        <div class="stage-stat-number">{data['total']}</div>
                        <div class="stage-stat-label">总任务</div>
                    </div>
                    <div class="stage-stat">
                        <div class="stage-stat-number">{data['completed']}</div>
                        <div class="stage-stat-label">已完成</div>
                    </div>
                    <div class="stage-stat">
                        <div class="stage-stat-number">{data['in_progress']}</div>
                        <div class="stage-stat-label">进行中</div>
                    </div>
                    <div class="stage-stat">
                        <div class="stage-stat-number">{data['not_started']}</div>
                        <div class="stage-stat-label">待开始</div>
                    </div>
                </div>
            </div>
"""
        
        html += f"""
        </div>
        
        <div class="footer">
            <div class="update-time">
                最后更新: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            </div>
        </div>
    </div>
    
    <script>
        // 自动刷新页面
        setTimeout(() => {{
            location.reload();
        }}, 300000); // 5分钟刷新一次
    </script>
</body>
</html>
"""
        return html
    
    def save_dashboard(self, filename: str = "dashboard.html"):
        """保存仪表板到HTML文件"""
        html = self.generate_html_dashboard()
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ 仪表板已生成: {filename}")

def main():
    generator = DashboardGenerator()
    generator.save_dashboard()

if __name__ == "__main__":
    main()
