以下是基于完整版认证 API 文档和数据库设计（PostgreSQL）的缓存方案设计。缓存方案的目标是提升系统性能、降低数据库负载，同时确保数据一致性和安全性。设计将使用 **Redis** 作为缓存层，因为它是高性能的内存数据库，支持多种数据结构（如字符串、哈希、集合）和过期机制，非常适合认证系统的高频读写场景。

---

### 缓存方案设计

#### 1. 设计目标
- **性能优化**: 缓存高频查询（如用户信息、令牌验证），减少数据库压力。
- **一致性**: 确保缓存与数据库数据同步，避免脏数据。
- **安全性**: 保护敏感数据（如令牌、2FA 密钥），避免泄露。
- **可扩展性**: 支持横向扩展和高并发。
- **失效策略**: 合理设置缓存过期时间，及时清理无用数据。

#### 2. 缓存工具选择：Redis
- **理由**:
  - **高性能**: 内存操作，单线程模型，适合高并发读写。
  - **丰富数据结构**: 支持字符串（令牌）、哈希（用户信息）、集合（角色）。
  - **过期机制**: 原生支持 TTL（Time To Live），自动清理过期数据。
  - **跨语言支持**: Python（redis-py）、Go（go-redis）、Node.js（ioredis）均有成熟客户端。
- **部署建议**: 单节点用于开发，高可用场景使用 Redis Sentinel 或 Redis Cluster。

#### 3. 缓存策略
- **缓存模式**: 
  - **Cache-Aside（懒加载）**: 应用代码控制缓存读写，适合大部分场景。
  - **Write-Through**: 写操作同步更新缓存和数据库，适合一致性要求高的场景（如令牌黑名单）。
- **过期时间**: 根据数据类型和访问频率设置 TTL。
- **一致性维护**: 使用事件驱动（如数据库触发器或消息队列）或延迟双删更新缓存。

#### 4. 缓存键设计
- 遵循命名规范：`模块:功能:标识`，使用冒号分隔，确保唯一性和可读性。
- 示例：
  - 用户信息: `user:info:<user_id>`
  - 刷新令牌: `auth:refresh:<token_hash>`
  - 黑名单令牌: `auth:blacklist:<token_identifier>`

#### 5. 端点缓存方案

##### 5.1 公共端点（Public Endpoints）
- **5.1.1 用户注册 - `POST /api/v1/public/register`**:
  - **缓存需求**: 无需缓存，注册是写操作，直接写入数据库。
  - **一致性**: 无需更新缓存，新用户数据在后续查询时懒加载。
- **5.1.2 忘记密码 - `POST /api/v1/public/forgot-password`**:
  - **缓存需求**: 可缓存 `Password_Resets` 表的 token。
  - **缓存键**: `auth:reset:token:<token>`
  - **缓存值**: JSON 序列化的记录（`user_id`, `expires_at`, `is_used`）。
  - **TTL**: 与 `expires_at` 一致（通常 1 小时）。
  - **策略**: Write-Through，写入数据库后同步缓存。
  - **好处**: 加速 token 验证，减少数据库查询。
- **5.1.3 重置密码 - `POST /api/v1/public/reset-password`**:
  - **缓存需求**: 检查 token 时读取缓存，更新密码后失效缓存。
  - **缓存键**: `auth:reset:token:<token>`
  - **操作**:
    - 先查缓存，若命中则验证 `expires_at` 和 `is_used`。
    - 未命中则查 `Password_Resets` 表并缓存。
    - 更新密码后删除缓存（`DEL auth:reset:token:<token>`）。
  - **策略**: Cache-Aside。
  - **好处**: 提升 token 验证性能。

##### 5.2 认证端点（Authentication Endpoints）
- **5.2.1 用户登录 - `POST /api/v1/auth/login`**:
  - **缓存需求**: 
    - 用户信息（`Users` 表）可缓存。
    - 刷新令牌（`Refresh_Tokens` 表）需缓存。
  - **缓存键**:
    - 用户: `user:info:<user_id>`
    - 刷新令牌: `auth:refresh:<token_hash>`
  - **缓存值**:
    - 用户: JSON 序列化的 `id`, 合并后是 `user_id`, `username`, `email`, `email_verified`, `is_active`。
    - 刷新令牌: JSON 序列化的 `user_id`, `expires_at`。
  - **TTL**:
    - 用户信息: 1 小时（高频访问，短期有效）。
    - 刷新令牌: 与 `expires_at` 一致。
  - **策略**: Cache-Aside，登录成功后缓存用户信息和刷新令牌。
  - **一致性**: 更新用户信息（如密码）时删除缓存（`DEL user:info:<user_id>`）。
  - **好处**: 加速后续用户信息查询和令牌验证。
- **5.2.2 刷新访问令牌 - `POST /api/v1/auth/token/refresh`**:
  - **缓存需求**: 检查刷新令牌状态。
  - **缓存键**: `auth:refresh:<token_hash>`
  - **操作**:
    - 先查缓存，若命中则验证 `expires_at`。
    - 未命中查 `Refresh_Tokens` 表并缓存。
    - 刷新成功后更新缓存，新令牌覆盖旧令牌。
    - 旧令牌加入黑名单（见下）。
  - **策略**: Cache-Aside。
- **5.2.3 登出 - `POST /api/v1/auth/logout`**:
  - **缓存需求**: 将访问和刷新令牌加入黑名单。
  - **缓存键**: `auth:blacklist:<token_identifier>`
  - **缓存值**: JSON 序列化的 `user_id`, `token_type`, `expires_at`。
  - **TTL**: 与 `expires_at` 一致。
  - **策略**: Write-Through，写入 `Blacklisted_Tokens` 后同步缓存。
  - **好处**: 快速检查令牌是否失效，减少数据库查询。

##### 5.3 用户端点（User Endpoints）
- **5.3.1 获取当前用户信息 - `GET /api/v1/users/me`**:
  - **缓存需求**: 高频查询用户信息。
  - **缓存键**: `user:info:<user_id>`
  - **缓存值**: JSON 序列化的用户信息（包括 `roles` 从 `User_Roles` 和 `Roles`）。
  - **TTL**: 1 小时。
  - **策略**: Cache-Aside，未命中时查 `Users`、`User_Roles` 和 `Roles`，并缓存。
  - **一致性**: 更新用户信息或角色时删除缓存。
- **5.3.2 更新用户信息 - `PATCH /api/v1/users/me`**:
  - **缓存需求**: 更新后同步缓存。
  - **缓存键**: `user:info:<user_id>`
  - **操作**: 更新 `Users` 表后，刷新缓存（`SET`）。
  - **策略**: Write-Through。
- **5.3.3 修改密码 - `PATCH /api/v1/users/me/password`**:
  - **缓存需求**: 更新密码后失效用户信息缓存。
  - **缓存键**: `user:info:<user_id>`
  - **操作**: 更新 `Users.password_hash` 后删除缓存（`DEL`）。
  - **策略**: Write-Through。
- **5.3.4 发送邮箱验证邮件 - `POST /api/v1/users/me/verify-email/send`**:
  - **缓存需求**: 缓存验证 token。
  - **缓存键**: `auth:email:token:<token>`
  - **缓存值**: JSON 序列化的 `user_id`, `expires_at`, `is_used`。
  - **TTL**: 与 `expires_at` 一致（通常 24 小时）。
  - **策略**: Write-Through。
- **5.3.5 验证邮箱 - `PATCH /api/v1/users/me/verify-email`**:
  - **缓存需求**: 检查 token 并更新用户信息。
  - **缓存键**: 
    - 验证 token: `auth:email:token:<token>`
    - 用户信息: `user:info:<user_id>`
  - **操作**:
    - 查缓存验证 token，未命中查 `Email_Verifications`。
    - 验证成功后更新 `Users.email_verified`，刷新用户信息缓存。
    - 删除 token 缓存（`DEL auth:email:token:<token>`）。
  - **策略**: Cache-Aside。

##### 5.4 两步验证端点（2FA Endpoints）
- **5.4.1 启用两步验证 - `POST /api/v1/2fa/enable`**:
  - **缓存需求**: 缓存 2FA 设置和备份码。
  - **缓存键**: 
    - 2FA 设置: `2fa:settings:<user_id>`
    - 备份码: `2fa:backup:<user_id>:<code_hash>`
  - **缓存值**: 
    - 2FA 设置: JSON 序列化的 `secret`, `is_enabled`。
    - 备份码: JSON 序列化的 `is_used`。
  - **TTL**: 
    - 2FA 设置: 1 小时。
    - 备份码: 永久（直到使用或清理）。
  - **策略**: Write-Through。
- **5.4.2 验证两步验证 - `POST /api/v1/2fa/verify`**:
  - **缓存需求**: 检查 2FA 设置。
  - **缓存键**: `2fa:settings:<user_id>`
  - **操作**: 查缓存获取 `secret`，验证成功后更新缓存（`is_enabled: true`）。
  - **策略**: Cache-Aside。
- **5.4.3 禁用两步验证 - `POST /api/v1/2fa/disable`**:
  - **缓存需求**: 更新 2FA 设置。
  - **缓存键**: `2fa:settings:<user_id>`
  - **操作**: 更新 `Two_Factor_Settings.is_enabled` 后刷新缓存。
  - **策略**: Write-Through。
- **5.4.4 生成备份码 - `POST /api/v1/2fa/backup-codes/generate`**:
  - **缓存需求**: 缓存新备份码。
  - **缓存键**: `2fa:backup:<user_id>:<code_hash>`
  - **缓存值**: JSON 序列化的 `is_used`。
  - **TTL**: 永久（直到使用）。
  - **操作**: 写入 `Two_Factor_Backup_Codes` 后缓存，删除旧备份码缓存。
  - **策略**: Write-Through。

##### 5.5 单点登录端点（SSO Endpoints）
- **5.5.1 发起 SSO 登录 - `GET /api/v1/sso/{provider}`**:
  - **缓存需求**: 无需缓存，重定向操作。
- **5.5.2 SSO 回调 - `GET /api/v1/sso/{provider}/callback`**:
  - **缓存需求**: 缓存用户信息和令牌。
  - **缓存键**: 
    - 用户: `user:info:<user_id>`
    - 刷新令牌: `auth:refresh:<token_hash>`
  - **操作**: 关联或创建用户后缓存用户信息和令牌。
  - **策略**: Cache-Aside。

##### 5.6 健康检查端点（Health Check Endpoint）
- **5.6.1 健康检查 - `GET /api/v1/health`**:
  - **缓存需求**: 可缓存服务状态。
  - **缓存键**: `health:status`
  - **缓存值**: JSON 序列化的 `overall`, `database`, `cache`。
  - **TTL**: 5 秒（频繁检查，短时有效）。
  - **策略**: Cache-Aside。

##### 5.7 角色管理端点（Role Management Endpoints）
- **5.7.1 获取角色列表 - `GET /api/v1/admin/roles`**:
  - **缓存需求**: 缓存角色列表。
  - **缓存键**: `roles:list`
  - **缓存值**: JSON 序列化的角色数组（`id`, `name`, `description`）。
  - **TTL**: 24 小时（角色变化少）。
  - **策略**: Cache-Aside。
- **5.7.2 创建角色 - `POST /api/v1/admin/roles`**:
  - **缓存需求**: 更新角色列表。
  - **缓存键**: `roles:list`
  - **操作**: 写入 `Roles` 后刷新缓存。
  - **策略**: Write-Through。
- **5.7.3 更新角色 - `PATCH /api/v1/admin/roles/{id}`**:
  - **缓存需求**: 更新角色列表。
  - **缓存键**: `roles:list`
  - **操作**: 更新 `Roles` 后刷新缓存。
  - **策略**: Write-Through。
- **5.7.4 删除角色 - `DELETE /api/v1/admin/roles/{id}`**:
  - **缓存需求**: 更新角色列表。
  - **缓存键**: `roles:list`
  - **操作**: 删除 `Roles` 后刷新缓存。
  - **策略**: Write-Through。
- **5.7.5 为用户分配角色 - `POST /api/v1/admin/users/{user_id}/roles`**:
  - **缓存需求**: 更新用户信息。
  - **缓存键**: `user:info:<user_id>`
  - **操作**: 更新 `User_Roles` 后刷新用户信息缓存。
  - **策略**: Write-Through。

#### 6. 一致性维护
- **事件驱动更新**: 使用数据库触发器或消息队列（如 Kafka）监听表变更，推送更新到 Redis。
- **延迟双删**:
  - 更新前删除缓存（`DEL`）。
  - 更新数据库后再次删除（确保一致性）。
- **定期清理**: Redis 的 TTL 自动过期，配合数据库清理任务（如 `cleanup_expired_records`）。

#### 7. Redis 配置建议
- **内存限制**: 根据负载设置 `maxmemory`（如 1GB），使用 `allkeys-lru` 淘汰策略。
- **持久化**: 启用 AOF（Append-Only File）确保数据恢复。
- **高可用**: 配置 Redis Sentinel，3 个节点（1 主 2 从）。
- **连接池**: 应用层设置连接池（如 Python redis-py 的 `ConnectionPool`）。

#### 8. 示例实现（伪代码）
```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def get_user_info(user_id):
    key = f"user:info:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    # 未命中，查数据库
    user = db.query("SELECT * FROM Users WHERE id = %s", (user_id,))
    roles = db.query("SELECT r.* FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = %s", (user_id,))
    data = {**user, "roles": roles}
    r.setex(key, 3600, json.dumps(data))  # 缓存 1 小时
    return data

def update_user_info(user_id, username):
    key = f"user:info:{user_id}"
    db.execute("UPDATE Users SET username = %s WHERE id = %s", (username, user_id))
    data = get_user_info(user_id)  # 获取最新数据
    r.set(key, json.dumps(data))  # 同步缓存
```

---

### 验证与 API 对齐
- **所有端点**: 每个 API 端点均设计了缓存方案，支持读写操作。
- **数据库表**: 缓存键和值与 `Users`、`Refresh_Tokens` 等表字段对齐。
- **性能**: 高频查询（如用户信息、令牌验证）通过缓存加速。
- **一致性**: Write-Through 和 Cache-Aside 确保数据同步。
