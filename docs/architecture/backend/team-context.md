# 团队 Context

## 目标

团队管理从全局同步 `team_service` 迁移到 `app/contexts/teams/`，由 Context 自己持有领域错误、应用流程、异步持久化和 FastAPI 接口。现有 `/api/v1/permissions/teams...` 与 `/api/v1/permissions/invitations...` 路径和响应结构保持不变。

## 目录职责

```text
app/contexts/teams/
├── domain/
│   ├── errors.py       # 团队领域错误
│   ├── models.py       # 查询值对象和 JSON 安全快照
│   └── rules.py        # 用户 ID、团队名和角色规范化规则
├── application/
│   ├── ports.py        # TeamRepository 端口
│   ├── team_service.py # 查询缓存和团队应用流程
│   └── cache_namespaces.py
├── infrastructure/
│   └── sqlalchemy_repository.py # AsyncSession 持久化适配器
└── interface/
    ├── schemas/        # FastAPI/Pydantic 请求响应模型
    ├── dependencies.py # 请求级依赖装配
    ├── management.py   # 轻量 HTTP 适配器
    └── router.py       # Context 路由出口
```

`backend/app/api/v1/api.py` 直接挂载 Context 路由。旧 `app/services/team_service.py` 和 `app/schemas/team.py` 已移除，不提供转发导入，避免新代码继续依赖历史边界。

## 查询与缓存

以下查询使用 cache-aside，默认 TTL 为 60 秒：

- 团队搜索，key 包含搜索参数和当前用户 ID 的摘要。
- 我的团队，key 包含当前用户 ID。
- 团队成员，key 包含团队 ID 和查看者 ID。

三类查询共享 `teams:queries` generation。所有成功的团队写操作在数据库提交后递增该 generation，使旧查询缓存不可达。缓存读取、写入或失效失败不会替代 MySQL，也不会回滚已经提交的业务事务。

加入申请列表和邀请列表不缓存。它们是用户直接处理的工作流队列，邀请还包含基于当前时间的过期判断，读取旧缓存会产生错误决策。

## 事务边界

`SqlAlchemyTeamRepository` 使用请求级 `AsyncSession`。每个命令在仓储内部完成校验、写入和提交，应用服务只在仓储成功返回后执行缓存失效。领域错误由 interface 层统一映射为 HTTP 400、403 或 404；未预期异常记录日志并返回 500。
