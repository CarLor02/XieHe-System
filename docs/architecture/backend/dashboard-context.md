# Dashboard 上下文

`app/contexts/dashboard/` 是面向工作台的跨上下文只读组合，不拥有患者、影像或报告数据。

- `application` 通过独立 reader ports 组合患者统计、当前身份可见的影像统计和报告活动。
- `infrastructure` 将这些 ports 适配到现有 SQLAlchemy 模型与 imaging application service。
- `/api/v1/dashboard/overview` 与 `/stats` 使用同一个概览用例；最近活动统一排序后截断。
- 系统指标、平均处理时间和任务尚无真实数据源，暂由明确的 demo supplement provider 提供，不参与业务授权或持久化。

正式 HTTP 接口只位于 `/api/v1/dashboard/*`；`main.py` 不再提供重复的临时 Dashboard 路由。
