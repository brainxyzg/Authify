以下是基于前述分析和改进建议的
**完整版数据库设计**，使用 PostgreSQL 实现。该设计完全支持完整版认证 API 文档中的所有端点（包括公共端点、认证端点、用户端点、两步验证端点、单点登录端点、健康检查端点和角色管理端点）。设计遵循第三范式，包含适当的约束、索引和注释，确保安全性、性能和可扩展性。

---

```sql
-- 数据库初始化：创建认证系统所需的表结构
-- 数据库名称：authify_db
-- 使用 PostgreSQL 16.x 或更高版本，确保支持所有特性

-- 创建数据库（可选，若已有数据库可跳过）
CREATE DATABASE authify_db
    WITH ENCODING = 'UTF8'
    TEMPLATE = template0
    LC_COLLATE = 'C'
    LC_CTYPE = 'C';

-- 连接到数据库
\connect authify_db;

-- 启用必要扩展（可选，用于 UUID 或其他高级功能）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 表：Users
-- 用途：存储用户信息，支持注册、登录和用户管理
CREATE TABLE Users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), -- RFC 5322 邮箱格式
    username VARCHAR(255) UNIQUE CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'), -- 可选，唯一用户名
    password_hash VARCHAR(60) NOT NULL, -- bcrypt 哈希，固定 60 字符
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- 账户状态
    email_verified BOOLEAN DEFAULT FALSE NOT NULL, -- 邮箱验证状态
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_username_or_email CHECK (username IS NOT NULL OR email IS NOT NULL) -- 确保至少有一个标识
);

-- 表：Roles
-- 用途：存储角色信息，支持角色管理端点
CREATE TABLE Roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name ~ '^[a-zA-Z0-9_]{3,50}$'), -- 角色名称
    description VARCHAR(255), -- 角色描述，支持创建和更新
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 表：User_Roles
-- 用途：用户与角色的多对多关系，支持角色分配
CREATE TABLE User_Roles (
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES Roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- 表：Refresh_Tokens
-- 用途：存储刷新令牌，支持令牌刷新和登出
CREATE TABLE Refresh_Tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL, -- SHA-512 哈希，支持更长令牌
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45), -- 支持 IPv4/IPv6
    user_agent TEXT,
    CONSTRAINT expires_after_issued CHECK (expires_at > issued_at)
);

-- 表：Blacklisted_Tokens
-- 用途：存储失效令牌，确保登出安全
CREATE TABLE Blacklisted_Tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token_identifier VARCHAR(128) NOT NULL, -- SHA-512 哈希
    token_type VARCHAR(10) NOT NULL CHECK (token_type IN ('access', 'refresh')), -- 令牌类型
    blacklisted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT expires_after_blacklisted CHECK (expires_at > blacklisted_at)
);

-- 表：Two_Factor_Settings
-- 用途：存储 2FA 设置，支持启用和验证
CREATE TABLE Two_Factor_Settings (
    user_id BIGINT PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    secret VARCHAR(64) NOT NULL, -- TOTP 密钥
    is_enabled BOOLEAN DEFAULT FALSE NOT NULL, -- 2FA 状态
    enabled_at TIMESTAMPTZ -- 启用时间，可空
);

-- 表：Two_Factor_Backup_Codes
-- 用途：存储 2FA 备份码，支持生成和使用
CREATE TABLE Two_Factor_Backup_Codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL, -- SHA-512 哈希
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    used_at TIMESTAMPTZ -- 使用时间，可空
);

-- 表：Email_Verifications
-- 用途：存储邮箱验证 token，支持验证流程
CREATE TABLE Email_Verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL, -- 验证 token
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT expires_after_requested CHECK (expires_at > requested_at)
);

-- 表：Password_Resets
-- 用途：存储密码重置 token，支持重置流程
CREATE TABLE Password_Resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL, -- 重置 token
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT expires_after_requested CHECK (expires_at > requested_at)
);

-- 表：Login_Methods
-- 用途：存储 SSO 登录方式，支持单点登录
CREATE TABLE Login_Methods (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'github')), -- 可扩展
    provider_user_id VARCHAR(100) NOT NULL, -- 提供商用户 ID
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
);

-- 索引优化
-- 用户表：加速登录和注册查询
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_username ON Users(username);

-- 用户角色表：加速角色查询
CREATE INDEX idx_user_roles_user ON User_Roles(user_id);
CREATE INDEX idx_user_roles_role ON User_Roles(role_id);

-- 刷新令牌表：加速令牌验证
CREATE INDEX idx_refresh_tokens_user ON Refresh_Tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON Refresh_Tokens(expires_at);

-- 黑名单表：加速黑名单检查
CREATE INDEX idx_blacklisted_tokens_user ON Blacklisted_Tokens(user_id);
CREATE INDEX idx_blacklisted_tokens_expires ON Blacklisted_Tokens(expires_at);

-- 2FA 设置表：加速用户查询
CREATE INDEX idx_two_factor_settings_user ON Two_Factor_Settings(user_id);

-- 2FA 备份码表：加速用户查询
CREATE INDEX idx_two_factor_backup_codes_user ON Two_Factor_Backup_Codes(user_id);

-- 邮箱验证表：加速 token 查询
CREATE INDEX idx_email_verifications_token ON Email_Verifications(token);
CREATE INDEX idx_email_verifications_user ON Email_Verifications(user_id);

-- 密码重置表：加速 token 查询
CREATE INDEX idx_password_resets_token ON Password_Resets(token);
CREATE INDEX idx_password_resets_user ON Password_Resets(user_id);

-- SSO 登录方式表：加速提供商查询
CREATE INDEX idx_login_methods_user ON Login_Methods(user_id);
CREATE INDEX idx_login_methods_provider ON Login_Methods(provider);

-- 初始化数据（可选）
-- 插入默认角色
INSERT INTO Roles (name, description) VALUES
    ('user', 'Regular user with basic access'),
    ('admin', 'Administrator with full access');

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON Users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 清理过期记录的函数（可选，供定期任务调用）
CREATE OR REPLACE PROCEDURE cleanup_expired_records()
LANGUAGE SQL
AS $$
    -- 清理过期刷新令牌
    DELETE FROM Refresh_Tokens WHERE expires_at < NOW();
    -- 清理过期黑名单令牌
    DELETE FROM Blacklisted_Tokens WHERE expires_at < NOW();
    -- 清理过期邮箱验证记录
    DELETE FROM Email_Verifications WHERE expires_at < NOW();
    -- 清理过期密码重置记录
    DELETE FROM Password_Resets WHERE expires_at < NOW();
    -- 清理已使用且过期的 2FA 备份码（保留 30 天）
    DELETE FROM Two_Factor_Backup_Codes WHERE is_used = TRUE AND used_at < NOW() - INTERVAL '30 days';
$$;

-- 设置定时任务（需启用 pg_cron 扩展）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup_expired_records', '1 hour', $$CALL cleanup_expired_records()$$);
```

---

### 设计验证与 API 端点支持

#### 1. 公共端点（Public Endpoints）

- **用户注册 (`POST /api/v1/public/register`)**: `Users` 表支持 `email`、`username` 和
  `password_hash`，唯一约束确保不重复。
- **忘记密码 (`POST /api/v1/public/forgot-password`)**: `Password_Resets` 表存储重置 token。
- **重置密码 (`POST /api/v1/public/reset-password`)**: `Password_Resets` 和 `Users`
  表支持 token 验证和密码更新。

#### 2. 认证端点（Authentication Endpoints）

- **用户登录 (`POST /api/v1/auth/login`)**: `Users` 表验证密码，`Two_Factor_Settings`
  支持 2FA，`Refresh_Tokens` 存储刷新令牌。
- **刷新访问令牌 (`POST /api/v1/auth/token/refresh`)**: `Refresh_Tokens` 和 `Blacklisted_Tokens`
  支持刷新和黑名单。
- **登出 (`POST /api/v1/auth/logout`)**: `Blacklisted_Tokens` 存储失效令牌。

#### 3. 用户端点（User Endpoints）

- **获取用户信息 (`GET /api/v1/users/me`)**: `Users`、`Two_Factor_Settings` 和 `User_Roles`
  提供完整信息。
- **更新用户信息 (`PATCH /api/v1/users/me`)**: `Users` 表支持 `username` 更新，触发器更新
  `updated_at`。
- **修改密码 (`PATCH /api/v1/users/me/password`)**: `Users` 表支持密码更新。
- **发送邮箱验证邮件 (`POST /api/v1/users/me/verify-email/send`)**: `Email_Verifications`
  存储 token。
- **验证邮箱 (`PATCH /api/v1/users/me/verify-email`)**: `Email_Verifications` 和 `Users`
  支持验证和状态更新。

#### 4. 两步验证端点（2FA Endpoints）

- **启用 2FA (`POST /api/v1/2fa/enable`)**: `Two_Factor_Settings` 存储
  `secret`，`Two_Factor_Backup_Codes` 存储备份码。
- **验证 2FA (`POST /api/v健康检查1/2fa/verify`)**: `Two_Factor_Settings` 支持验证和启用。
- **禁用 2FA (`POST /api/v1/2fa/disable`)**: `Two_Factor_Settings` 支持状态更新。
- **生成备份码 (`POST /api/v1/2fa/backup-codes/generate`)**: `Two_Factor_Backup_Codes`
  支持新码生成。

#### 5. 单点登录端点（SSO Endpoints）

- **发起 SSO 登录 (`GET /api/v1/sso/{provider}`)**: 无需数据库直接支持。
- **SSO 回调 (`GET /api/v1/sso/{provider}/callback`)**: `Login_Methods` 和 `Users`
  支持用户关联和令牌颁发。

#### 6. 健康检查端点（Health Check Endpoint）

- **健康检查 (`GET /api/v1/health`)**: 无需特定表，数据库连接状态由后端检查。

#### 7. 角色管理端点（Role Management Endpoints）

- **获取角色列表 (`GET /api/v1/admin/roles`)**: `Roles` 表支持。
- **创建角色 (`POST /api/v1/admin/roles`)**: `Roles` 表支持 `name` 和 `description`。
- **更新角色 (`PATCH /api/v1/admin/roles/{id}`)**: `Roles` 表支持更新。
- **删除角色 (`DELETE /api/v1/admin/roles/{id}`)**: `Roles` 和 `User_Roles` 支持删除。
- **分配角色 (`POST /api/v1/admin/users/{user_id}/roles`)**: `User_Roles` 支持分配。

---

### 设计亮点

1. **一致性**: 所有 API 端点均有数据库支持，字段长度和约束与参数要求对齐。
2. **安全性**:
   - 使用 bcrypt 和 SHA-512 哈希存储敏感数据。
   - 外键约束和唯一性检查确保数据完整性。
   - `Blacklisted_Tokens` 表增强登出安全。
3. **性能优化**: 索引覆盖高频查询（如登录、令牌验证）。
4. **可维护性**:
   - 触发器自动更新 `updated_at`。
   - 提供清理过期记录的存储过程。
5. **扩展性**: 支持角色管理、SSO 和未来的功能扩展。

---

### 使用说明

1. **初始化**: 执行上述 SQL 脚本创建数据库和表。
2. **开发**: 使用 Python（SQLAlchemy）、Go（database/sql）或 Next.js（pg 驱动）连接。
3. **维护**: 定期调用 `cleanup_expired_records` 清理过期数据。
