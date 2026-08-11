# Patient Context 结构

患者链路是后端向 context-first DDD 迁移的第一个上下文，当前不划分 bounded context，也不使用 `presentation` 层。

```text
app/contexts/patients/
├── domain/
│   ├── models.py          # 查询值对象与患者只读快照
│   ├── rules.py           # 年龄、性别等纯业务规则
│   └── errors.py          # 与 FastAPI 无关的领域异常
├── application/
│   ├── ports/             # 按读取职责拆分的仓储端口
│   ├── patient_service.py # 管理 API 用例与缓存编排
│   └── archive_service.py # 未挂载的档案读取用例
├── infrastructure/
│   └── persistence/
│       ├── models.py
│       ├── patient_repository.py
│       └── patient_archive_repository.py
└── interface/
    └── http/v1/
        ├── schemas/       # FastAPI/Pydantic 输入输出协议
        ├── routes/        # 薄 HTTP handler
        ├── dependencies.py
        └── router.py      # 当前公开路由
```

`app/api/v1/api.py` 只通过 `contexts.patients.interface` 的稳定出口挂载路由。旧的 `api/v1/endpoints/patients`、同步 `PatientService`、`PatientDAO` 以及迁移前的扁平模块均已移除，不提供兼容 re-export。

当前公开 API 路径保持 `/api/v1/patients` 不变，并使用请求级 `AsyncSession`。患者档案旧路由此前未挂载；本轮只保留异步、可缓存的摘要和完整读取应用能力，不会意外扩大公开 API。
