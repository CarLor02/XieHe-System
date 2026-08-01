# Redis 双实例部署

## 实例职责

系统运行两个物理隔离的 Redis 实例：

| Compose 服务 | 容器 | 环境变量 | 数据 | 故障语义 |
| --- | --- | --- | --- | --- |
| `redis` | `medical_redis` | `REDIS_STATE_URL` | 认证状态、撤销记录、API Key、分布式锁 | 相关请求失败关闭 |
| `redis-cache` | `medical_redis_cache` | `REDIS_CACHE_URL` | 可重建查询结果和 generation | 回退 MySQL |

不要通过不同 DB 编号把两类数据放入同一 Redis 进程。Redis 的内存上限和淘汰策略是实例级配置，共用进程会让查询缓存淘汰认证状态。

## 持久化和内存策略

状态实例使用 `infrastructure/redis/redis.conf`：

- `maxmemory-policy noeviction`
- AOF `appendfsync everysec`
- RDB 快照
- `redis_data` 持久卷

查询缓存实例使用 `infrastructure/redis/cache.conf`：

- `maxmemory-policy allkeys-lru`
- 关闭 AOF 和 RDB
- 不挂载数据卷

## 环境配置

首次部署从示例创建本地配置：

```bash
cp dotenv/.env.redis.example dotenv/.env.redis
cp dotenv/.env.cache.example dotenv/.env.cache
```

容器内默认地址为：

```dotenv
REDIS_STATE_URL=redis://redis:6379/0
REDIS_CACHE_URL=redis://redis-cache:6379/0
```

宿主机端口由 `dotenv/.env.ports` 控制，示例分别为 `6380` 和 `6381`。生产环境应按现有密钥管理方式在 URL 中配置密码，不要把真实凭据提交到仓库。

## 启动与检查

使用项目统一入口启动：

```bash
./scripts/compose.sh up -d
./scripts/compose.sh ps
```

分别检查两个实例：

```bash
docker exec medical_redis redis-cli ping
docker exec medical_redis_cache redis-cli ping
```

后端 `/api/v1/health/component/redis` 会分别报告 `state` 和 `query_cache`。查询缓存不可用时可继续提供患者查询；状态实例不可用时认证状态相关 API 返回 503。

## 运维边界

- 不对查询缓存做备份或恢复。
- 状态实例需要随数据库一起纳入备份和容量告警。
- 状态实例触发 `noeviction` 写失败时应扩容或清理过期异常数据，不能临时改成 LRU。
- 更换 `CACHE_NAMESPACE` 可使一整版查询缓存失效，不会影响状态实例。
