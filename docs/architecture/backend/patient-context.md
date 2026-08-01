# Patient Context 结构

患者链路是后端向 context-first DDD 迁移的第一个上下文，当前不划分 bounded context，也不使用 `presentation` 层。

```text
app/contexts/patients/
├── domain/
│   ├── models.py          # 查询值对象与患者只读快照
│   ├── rules.py           # 年龄、性别等纯业务规则
│   └── errors.py          # 与 FastAPI 无关的领域异常
├── application/
│   ├── ports.py           # 仓储端口
│   ├── patient_service.py # 管理 API 用例与缓存编排
│   └── archive_service.py # 未挂载的档案读取用例
├── infrastructure/
│   ├── sqlalchemy_repository.py
│   └── sqlalchemy_archive_repository.py
└── interface/
    ├── schemas/           # FastAPI/Pydantic 输入输出协议
    ├── management.py      # 薄 HTTP handler
    └── router.py          # 当前公开路由
```

`app/api/v1/api.py` 直接导入 `contexts.patients.interface.router`。旧的 `api/v1/endpoints/patients`、同步 `PatientService` 与 `PatientDAO` 已移除，不提供兼容 re-export。

当前公开 API 路径保持 `/api/v1/patients` 不变，并使用请求级 `AsyncSession`。患者档案旧路由此前未挂载；本轮只保留异步、可缓存的摘要和完整读取应用能力，不会意外扩大公开 API。
