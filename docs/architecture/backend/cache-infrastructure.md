# 后端缓存基础设施

## 目标

后端缓存按数据语义拆成两条独立链路：

- `app/shared/redis/` 管理不可随意丢失的短期状态，包括刷新令牌、访问令牌黑名单、API Key 与分布式任务锁。
- `app/shared/cache/` 管理可从 MySQL 重建的查询结果，使用 aiocache 适配 Redis，并统一实现 cache-aside。

这两条链路不能共用 Redis 淘汰策略。状态实例发生故障时，认证与协调操作必须失败关闭；查询缓存发生故障时，业务查询必须回退 MySQL。

## 分层职责

```text
app/shared/
├── cache/
│   ├── contracts.py       # 应用层依赖的异步缓存端口
│   ├── keys.py            # 稳定、无明文隐私数据的 key 生成
│   ├── service.py         # cache-aside 与 generation invalidation
│   └── aiocache/adapter.py# aiocache Redis 生命周期适配
└── redis/
    ├── client.py          # 状态 Redis 连接生命周期和故障后重连
    ├── state_store.py     # JSON 状态端口
    └── lock.py            # owner-safe Lua 分布式租约
```

业务 context 只能依赖 `AsyncCache`、`CacheAsideService`、`CacheGenerationService` 或 `StateStore` 等明确端口，不直接创建 Redis 客户端。

## 查询缓存规则

1. MySQL 永远是真实数据源。
2. 读取先查缓存；缓存未命中或 Redis 异常时查询 MySQL。
3. 数据库写入提交成功后递增对应 generation key，使旧 key 不再可达。
4. generation 失效失败不得回滚已经提交的数据库事务。
5. key 中的搜索词、手机号等参数先使用规范 JSON 编码，再以 SHA-256 摘要写入 key，避免泄露患者信息。
6. 导出类查询不读缓存；跨聚合的 `has_images` 患者筛选暂时不缓存。

患者 context 当前使用：

| 数据 | 默认 TTL | 失效命名空间 |
| --- | ---: | --- |
| 患者列表 | 60 秒 | `patients:list` |
| 患者详情 | 300 秒 | `patients:detail:{id}` |
| 患者档案读取 | 300 秒 | `patients:archive:{id}` |

TTL 可通过 `dotenv/.env.cache` 调整。`CACHE_NAMESPACE` 不应包含末尾冒号，aiocache 的 Redis 后端会自动插入 namespace 分隔符。

## 状态 Redis 规则

- 刷新令牌、黑名单与 API Key 使用 `StateStore` 保存。
- 状态 Redis 不可用时，不允许跳过撤销检查或把无状态 JWT 当作有效请求，API 返回 503。
- 后台 leader 锁使用随机 owner token；续租和释放由 Lua 原子比较 token，不能释放其他 worker 的锁。
- 应用启动时连接失败后，后续状态请求和后台锁重试会尝试重新建立连接。

## 后续 context 接入

影像、测量结果等 context 接入时应复用 cache-aside 与 generation 机制，为每个聚合定义自己的 namespace；不要恢复全局装饰器缓存，也不要让基础设施反向依赖业务模型。
