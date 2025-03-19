这份清单依然按照 **数据层 (Data Layer) -> 服务层 (Service Layer) -> API 层 (API Layer)**
的开发顺序组织，并在每个阶段内部，尽可能按照依赖关系排序任务。

**### 阶段一：基础设施与数据层实现 (Data Layer)**

**目标:** 构建数据模型和数据访问层，为上层服务提供数据基础。

**开发顺序 & 依赖关系:** 数据表模型必须先于数据访问方法实现。

#### **1. 数据库模型实现 (Data Models)**

- **核心模块 (无依赖):**

  - [x] 实现 `Users` 表模型 (models/users.go)
  - [x] 实现 `Roles` 表模型 (models/roles.go)

- **认证与令牌模块 (依赖 `Users`):**

  - [x] 实现 `Refresh_Tokens` 表模型 (models/refresh_tokens.go) **(依赖 `Users` 模型)**
  - [x] 实现 `Blacklisted_Tokens` 表模型 (models/blacklisted_tokens.go) **(依赖 `Users` 模型)**

- **两步验证模块 (依赖 `Users`):**

  - [x] 实现 `Two_Factor_Settings` 表模型 (models/two_factor_settings.go) **(依赖 `Users` 模型)**
  - [x] 实现 `Two_Factor_Backup_Codes` 表模型 (models/two_factor_backup_codes.go) **(依赖
        `Two_Factor_Settings` 模型)**

- **邮箱验证与密码重置模块 (依赖 `Users`):**

  - [x] 实现 `Email_Verifications` 表模型 (models/email_verifications.go) **(依赖 `Users` 模型)**
  - [x] 实现 `Password_Resets` 表模型 (models/password_resets.go) **(依赖 `Users` 模型)**

- **单点登录模块 (依赖 `Users`):**
  - [x] 实现 `Login_Methods` 表模型 (models/login_methods.go) **(依赖 `Users` 模型)**

#### **2. 数据访问方法实现 (Data Access Methods / Repositories)**

- **用户与角色模块 (依赖 用户与角色模型):**

  - [x] 实现 `Users` 表数据访问方法 (repositories/users_repository.go) **(依赖 `Users` 模型)**
  - [x] 实现 `Roles` 表数据访问方法 (repositories/roles_repository.go) **(依赖 `Roles` 模型)**
  - [x] 实现 `User_Roles` 表数据访问方法 (repositories/user_roles_repository.go) **(依赖
        `User_Roles`, `Users`, `Roles` 模型)**

- **认证与令牌模块 (依赖 认证与令牌模型):**

  - [x] 实现 `Refresh_Tokens` 表数据访问方法 (repositories/refresh_tokens_repository.go) **(依赖
        `Refresh_Tokens` 模型)**
  - [x] 实现 `Blacklisted_Tokens` 表数据访问方法 (repositories/blacklisted_tokens_repository.go)
        **(依赖 `Blacklisted_Tokens` 模型)**

- **两步验证模块 (依赖 两步验证模型):**

  - [x] 实现 `Two_Factor_Settings` 表数据访问方法 (repositories/two_factor_settings_repository.go)
        **(依赖 `Two_Factor_Settings` 模型)**
  - [x] 实现 `Two_Factor_Backup_Codes`
        表数据访问方法 (repositories/two_factor_backup_codes_repository.go) **(依赖
        `Two_Factor_Backup_Codes` 模型)**

- **邮箱验证与密码重置模块 (依赖 邮箱验证与密码重置模型):**

  - [x] 实现 `Email_Verifications` 表数据访问方法 (repositories/email_verifications_repository.go)
        **(依赖 `Email_Verifications` 模型)**
  - [x] 实现 `Password_Resets` 表数据访问方法 (repositories/password_resets_repository.go) **(依赖
        `Password_Resets` 模型)**

- **单点登录模块 (依赖 单点登录模型):**
  - [x] 实现 `Login_Methods` 表数据访问方法 (repositories/login_methods_repository.go) **(依赖
        `Login_Methods` 模型)**

#### **3. 数据层单元测试 (Unit Tests for Data Layer)**

- [ ] 编写用户与角色模块的数据层单元测试 (tests/data_layer/users_roles_test.go)
- [ ] 编写认证与令牌模块的数据层单元测试 (tests/data_layer/auth_token_test.go)
- [ ] 编写两步验证模块的数据层单元测试 (tests/data_layer/two_factor_auth_test.go)
- [ ] 编写邮箱验证与密码重置模块的数据层单元测试 (tests/data_layer/email_password_test.go)
- [ ] 编写单点登录模块的数据层单元测试 (tests/data_layer/sso_test.go)

#### **4. 数据库迁移脚本 (Database Migrations)**

- [ ] 创建数据库初始化脚本 (migrations/init.sql)
- [ ] 创建数据库迁移管理工具 (使用例如 goose, golang-migrate 等)
- [ ] 编写数据库种子数据脚本（用于测试和开发）(seed/seed.sql)

**### 阶段二：服务层实现 (Service Layer)**

**目标:** 基于数据层，实现业务逻辑和核心服务功能。

**开发顺序 & 依赖关系:**
服务层依赖于数据层，因此必须在数据层完成后进行。 服务之间的依赖关系也需要考虑，例如用户服务通常是其他服务的基础。

#### **1. 用户服务 (User Service) (依赖 用户与角色数据层):**

- [ ] 实现用户注册服务 (services/user_service.go - `RegisterUser`) **(依赖 用户数据访问方法)**
- [ ] 实现用户信息管理服务 (services/user_service.go - `GetUserInfo`, `UpdateUserInfo`)
      **(依赖 用户数据访问方法)**
- [ ] 实现用户角色管理服务 (services/user_service.go - `GetUserRoles`, `AssignRoleToUser`,
      `RemoveRoleFromUser`) **(依赖 用户和角色数据访问方法)**
- [ ] 编写用户服务的单元测试 (tests/service_layer/user_service_test.go)
- [ ] 编写用户服务的集成测试 (tests/integration/user_service_integration_test.go)

#### **2. 认证服务 (Auth Service) (依赖 用户服务, 令牌数据层):**

- [ ] 实现用户登录服务 (services/auth_service.go - `Login`) **(依赖 用户服务, 用户数据访问方法)**
- [ ] 实现令牌管理服务 (services/auth_service.go - `GenerateAccessToken`, `GenerateRefreshToken`,
      `ValidateAccessToken`, `ValidateRefreshToken`, `RefreshTokenPair`)
      **(依赖 令牌数据访问方法, 用户服务)**
- [ ] 实现登出服务 (services/auth_service.go - `Logout`) **(依赖 令牌黑名单数据访问方法)**
  - 功能：使当前用户的访问令牌失效，防止令牌被进一步使用
  - 实现要点：
    - 从请求中提取访问令牌
    - 验证令牌有效性
    - 将令牌添加到黑名单数据库表中
    - 可选：同时使相关的刷新令牌失效
  - 安全考虑：
    - 确保即使在分布式环境中也能正确识别已登出的令牌
    - 考虑令牌黑名单的清理策略（过期令牌的自动移除）
  - 接口定义：`Logout(tokenString string, userId int64) error`
- [ ] 完善登录服务中的两步验证功能 (services/auth_service.go - `Login`) **(依赖 两步验证服务)**
  - 功能：在用户登录时验证两步验证码
  - 实现要点：
    - 检查用户是否启用了两步验证
    - 如果启用，验证提供的TOTP验证码或备份码
    - 验证成功后才允许登录
  - 接口更新：`Login(usernameOrEmail, password string, twoFactorCode string) (*LoginResponse, error)`
- [ ] 编写认证服务的单元测试 (tests/service_layer/auth_service_test.go)
- [ ] 编写认证服务的集成测试 (tests/integration/auth_service_integration_test.go)

#### **3. 邮箱与密码服务 (Email & Password Service) (依赖 用户服务, 邮箱验证和密码重置数据层, 邮件发送服务 (假设有)):**

- [ ] 实现密码修改服务 (services/password_service.go - `ChangePassword`)
      **(依赖 用户服务, 用户数据访问方法)**
- [ ] 实现忘记密码服务 (services/password_service.go - `ForgotPassword`)
      **(依赖 密码重置数据访问方法, 邮件发送服务)**
- [ ] 实现密码重置服务 (services/password_service.go - `ResetPassword`)
      **(依赖 密码重置数据访问方法)**
- [ ] 实现发送邮箱验证服务 (services/email_service.go - `SendVerificationEmail`)
      **(依赖 邮箱验证数据访问方法, 邮件发送服务, 用户服务)**
- [ ] 实现邮箱验证服务 (services/email_service.go - `VerifyEmail`)
      **(依赖 邮箱验证数据访问方法, 用户服务)**
- [ ] 编写邮箱与密码服务的单元测试 (tests/service_layer/email_password_service_test.go)
- [ ] 编写邮箱与密码服务的集成测试 (tests/integration/email_password_service_integration_test.go)

#### **4. 两步验证服务 (Two-Factor Authentication Service) (依赖 用户服务, 两步验证数据层):**

- [ ] 实现 TOTP 生成与验证服务 (services/two_factor_service.go - `GenerateTOTP`, `ValidateTOTP`)
- [ ] 实现备份码生成与验证服务 (services/two_factor_service.go - `GenerateBackupCodes`,
      `ValidateBackupCode`)
- [ ] 实现两步验证启用服务 (services/two_factor_service.go - `EnableTwoFactorAuth`)
      **(依赖 两步验证设置数据访问方法, 用户服务)**
- [ ] 实现两步验证禁用服务 (services/two_factor_service.go - `DisableTwoFactorAuth`)
      **(依赖 两步验证设置数据访问方法, 用户服务)**
- [ ] 编写两步验证服务的单元测试 (tests/service_layer/two_factor_service_test.go)
- [ ] 编写两步验证服务的集成测试 (tests/integration/two_factor_service_integration_test.go)

#### **5. 单点登录服务 (Single Sign-On Service) (依赖 用户服务, 单点登录数据层, OAuth 库):**

- [ ] 实现 OAuth 提供商集成 (services/sso_service.go - `IntegrateOAuthProvider`) (例如 Google,
      GitHub 等, **(依赖 OAuth 客户端库， 例如 `golang.org/x/oauth2` )**)
- [ ] 实现 SSO 登录流程服务 (services/sso_service.go - `InitiateSSOLoginFlow`, `HandleSSOCallback`)
      **(依赖 OAuth 提供商集成, 用户服务, 单点登录数据访问方法)**
- [ ] 实现 SSO 账户关联服务 (services/sso_service.go - `AssociateSSOAccount`)
      **(依赖 用户服务, 单点登录数据访问方法)**
- [ ] 编写单点登录服务的单元测试 (tests/service_layer/sso_service_test.go)
- [ ] 编写单点登录服务的集成测试 (tests/integration/sso_service_integration_test.go)

**### 阶段三：API 层实现 (API Layer)**

**目标:** 构建 API 接口，对外暴露服务层的功能。

**开发顺序 & 依赖关系:**
API 层依赖于服务层，必须在服务层完成后进行。 API 端点的实现顺序可以根据 API 文档的模块划分，或者按照优先级任务清单排序。

#### **1. 公共 API 端点 (Public API Endpoints) (依赖 用户服务, 邮箱与密码服务):**

- [ ] 实现用户注册端点 (api/public_api.go - `RegisterHandler`) **(依赖 用户注册服务)**
  - [ ] 编写用户注册端点的单元测试 (tests/api_layer/public_api_test.go)
  - [ ] 编写用户注册端点的集成测试 (tests/integration/public_api_integration_test.go)
- [ ] 实现忘记密码端点 (api/public_api.go - `ForgotPasswordHandler`) **(依赖 忘记密码服务)**
  - [ ] 编写忘记密码端点的单元测试 (tests/api_layer/public_api_test.go)
  - [ ] 编写忘记密码端点的集成测试 (tests/integration/public_api_integration_test.go)
- [ ] 实现重置密码端点 (api/public_api.go - `ResetPasswordHandler`) **(依赖 重置密码服务)**
  - [ ] 编写重置密码端点的单元测试 (tests/api_layer/public_api_test.go)
  - [ ] 编写重置密码端点的集成测试 (tests/integration/public_api_integration_test.go)

#### **2. 认证 API 端点 (Auth API Endpoints) (依赖 认证服务):**

- [ ] 实现用户登录端点 (api/auth_api.go - `LoginHandler`) **(依赖 用户登录服务)**
  - [ ] 编写用户登录端点的单元测试 (tests/api_layer/auth_api_test.go)
  - [ ] 编写用户登录端点的集成测试 (tests/integration/auth_api_integration_test.go)
- [ ] 实现令牌刷新端点 (api/auth_api.go - `RefreshTokenHandler`) **(依赖 令牌刷新服务)**
  - [ ] 编写令牌刷新端点的单元测试 (tests/api_layer/auth_api_test.go)
  - [ ] 编写令牌刷新端点的集成测试 (tests/integration/auth_api_integration_test.go)
- [ ] 实现登出端点 (api/auth_api.go - `LogoutHandler`) **(依赖 登出服务)**
  - [ ] 编写登出端点的单元测试 (tests/api_layer/auth_api_test.go)
  - [ ] 编写登出端点的集成测试 (tests/integration/auth_api_integration_test.go)

#### **3. 用户 API 端点 (User API Endpoints) (依赖 用户服务, 认证中间件 (用于身份验证)):**

- [ ] 实现获取用户信息端点 (api/user_api.go - `GetMeHandler`)
      **(依赖 用户信息管理服务, 认证中间件)**
  - [ ] 编写获取用户信息端点的单元测试 (tests/api_layer/user_api_test.go)
  - [ ] 编写获取用户信息端点的集成测试 (tests/integration/user_api_integration_test.go)
- [ ] 实现修改密码端点 (api/user_api.go - `ChangePasswordHandler`)
      **(依赖 密码修改服务, 认证中间件)**
  - [ ] 编写修改密码端点的单元测试 (tests/api_layer/user_api_test.go)
  - [ ] 编写修改密码端点的集成测试 (tests/integration/user_api_integration_test.go)
- [ ] 实现发送邮箱验证端点 (api/user_api.go - `SendVerifyEmailHandler`)
      **(依赖 发送邮箱验证服务, 认证中间件)**
  - [ ] 编写发送邮箱验证端点的单元测试 (tests/api_layer/user_api_test.go)
  - [ ] 编写发送邮箱验证端点的集成测试 (tests/integration/user_api_integration_test.go)
- [ ] 实现验证邮箱端点 (api/user_api.go - `VerifyEmailHandler`) **(依赖 邮箱验证服务, 认证中间件)**
  - [ ] 编写验证邮箱端点的单元测试 (tests/api_layer/user_api_test.go)
  - [ ] 编写验证邮箱端点的集成测试 (tests/integration/user_api_integration_test.go)

#### **4. 两步验证 API 端点 (Two-Factor Authentication API Endpoints) (依赖 两步验证服务, 认证中间件):**

- [ ] 实现启用两步验证端点 (api/two_factor_api.go - `Enable2FAHandler`)
      **(依赖 两步验证启用服务, 认证中间件)**
  - [ ] 编写启用两步验证端点的单元测试 (tests/api_layer/two_factor_api_test.go)
  - [ ] 编写启用两步验证端点的集成测试 (tests/integration/two_factor_api_integration_test.go)
- [ ] 实现验证两步验证端点 (api/two_factor_api.go - `Verify2FAHandler`)
      **(依赖 两步验证验证服务, 认证中间件)**
  - [ ] 编写验证两步验证端点的单元测试 (tests/api_layer/two_factor_api_test.go)
  - [ ] 编写验证两步验证端点的集成测试 (tests/integration/two_factor_api_integration_test.go)
- [ ] 实现禁用两步验证端点 (api/two_factor_api.go - `Disable2FAHandler`)
      **(依赖 两步验证禁用服务, 认证中间件)**
  - [ ] 编写禁用两步验证端点的单元测试 (tests/api_layer/two_factor_api_test.go)
  - [ ] 编写禁用两步验证端点的集成测试 (tests/integration/two_factor_api_integration_test.go)
- [ ] 实现生成备份码端点 (api/two_factor_api.go - `GenerateBackupCodesHandler`)
      **(依赖 备份码生成服务, 认证中间件)**
  - [ ] 编写生成备份码端点的单元测试 (tests/api_layer/two_factor_api_test.go)
  - [ ] 编写生成备份码端点的集成测试 (tests/integration/two_factor_api_integration_test.go)

#### **5. 单点登录 API 端点 (Single Sign-On API Endpoints) (依赖 单点登录服务):**

- [ ] 实现 SSO 登录发起端点 (api/sso_api.go - `SSOLoginInitiateHandler`) **(依赖 SSO 登录流程服务)**
  - [ ] 编写 SSO 登录发起端点的单元测试 (tests/api_layer/sso_api_test.go)
  - [ ] 编写 SSO 登录发起端点的集成测试 (tests/integration/sso_api_integration_test.go)
- [ ] 实现 SSO 回调端点 (api/sso_api.go - `SSOCallbackHandler`) **(依赖 SSO 回调处理服务)**
  - [ ] 编写 SSO 回调端点的单元测试 (tests/api_layer/sso_api_test.go)
  - [ ] 编写 SSO 回调端点的集成测试 (tests/integration/sso_api_integration_test.go)

#### **6. 健康检查 API 端点 (Health Check API Endpoint) (无依赖):**

- [ ] 实现健康检查端点 (api/health_api.go - `HealthCheckHandler`) **(无服务层依赖， 可直接实现)**
  - [ ] 编写健康检查端点的单元测试 (tests/api_layer/health_api_test.go)

**### 阶段四：安全与性能优化 (Security & Performance Optimization)**

**目标:** 增强系统安全性和性能。

**开发顺序 & 依赖关系:**
安全增强和性能优化通常在功能基本完成后进行，但某些安全措施 (例如输入验证) 应该在开发过程中就考虑。

#### **1. 安全增强 (Security Enhancements):**

- [ ] 实现 JWT 签名与验证的安全增强 (security/jwt_security.go)
- [ ] 实现请求速率限制中间件 (middleware/rate_limit_middleware.go)
- [ ] 实现 CORS 安全配置 (config/cors_config.go 或 middleware/cors_middleware.go)
- [ ] 实现 CSRF 保护 (middleware/csrf_middleware.go)
- [ ] 实现安全头部配置 (middleware/security_headers_middleware.go)
- [ ] 编写安全测试用例 (tests/security_test.go)

#### **2. 性能优化 (Performance Optimizations):**

- [ ] 实现数据库连接池优化 (database/db_connection_pool.go)
- [ ] 实现缓存层（Redis）集成 (cache/redis_cache.go 或 services/cache_service.go)
- [ ] 实现查询优化 (repositories 层或 services 层代码优化， 数据库索引优化等)
- [ ] 编写性能测试用例 (tests/performance_test.go)

**### 阶段五：文档与部署 (Documentation & Deployment)**

**目标:** 完善文档，完成部署配置。

**开发顺序 & 依赖关系:**
文档编写可以贯穿整个开发过程，但最终完善通常在功能开发基本完成后进行。 部署配置可以在开发后期或并行进行。

#### **1. 文档完善 (Documentation):**

- [ ] 更新 API 文档 (apis.md)
- [ ] 编写开发者指南 (developer_guide.md)
- [ ] 编写部署指南 (deployment_guide.md)

#### **2. 部署配置 (Deployment Configuration):**

- [ ] 完善 Dockerfile 和 docker-compose.yml 配置 (docker/)
- [ ] 完善 Google Cloud Run 部署配置 (gcloud/)
- [ ] 设置 CI/CD 流程 (GitHub Actions, GitLab CI, Jenkins 等)

**### 高优先级 (必须首先完成 - 核心基础功能)**

1.  **用户注册与登录 (User Registration & Login):**
    **(垂直切片开发 - 端到端实现用户注册和登录功能)**

    - [ ] **数据层:**
      - [ ] 实现 `Users` 表模型和数据访问方法
      - [ ] 编写 `Users` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现用户注册服务
      - [ ] 实现用户登录服务
      - [ ] 编写用户服务 (注册, 登录) 单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现用户注册 API 端点 (`POST /api/v1/public/register`)
      - [ ] 实现用户登录 API 端点 (`POST /api/v1/auth/login`)
      - [ ] 编写公共 API 端点 (注册, 登录) 单元测试和集成测试
    - [ ] **端到端测试:** 编写用户注册和登录的端到端测试用例

2.  **令牌管理 (Token Management):** **(垂直切片开发 - 端到端实现令牌刷新和登出功能)**

    - [ ] **数据层:**
      - [ ] 实现 `Refresh_Tokens` 和 `Blacklisted_Tokens` 表模型和数据访问方法
      - [ ] 编写 `Refresh_Tokens` 和 `Blacklisted_Tokens` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现令牌管理服务 (生成, 验证, 刷新)
      - [ ] 实现登出服务
      - [ ] 编写认证服务 (令牌管理, 登出) 单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现令牌刷新 API 端点 (`POST /api/v1/auth/refresh`)
      - [ ] 实现登出 API 端点 (`POST /api/v1/auth/logout`)
      - [ ] 编写认证 API 端点 (令牌刷新, 登出) 单元测试和集成测试
    - [ ] **端到端测试:** 编写令牌刷新和登出的端到端测试用例

3.  **用户信息管理 (User Info Management):** **(垂直切片开发 - 端到端实现获取和修改用户信息功能)**
    - [ ] **服务层:**
      - [ ] 实现用户信息管理服务 (获取, 修改)
      - [ ] 编写用户信息管理服务单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现获取用户信息 API 端点 (`GET /api/v1/users/me`)
      - [ ] 实现修改密码 API 端点 (`PATCH /api/v1/users/me/password`)
            **(注意依赖 密码修改服务 - 中优先级)**
      - [ ] 编写用户 API 端点 (获取用户信息, 修改密码) 单元测试和集成测试
    - [ ] **端到端测试:** 编写获取和修改用户信息的端到端测试用例

**### 中优先级 (应该完成 - 增强核心功能, 提升用户体验和安全性)**

1.  **邮箱验证与密码重置 (Email Verification & Password Reset):**
    **(垂直切片开发 - 端到端实现邮箱验证和密码重置流程)**

    - [ ] **数据层:**
      - [ ] 实现 `Email_Verifications` 和 `Password_Resets` 表模型和数据访问方法
      - [ ] 编写 `Email_Verifications` 和 `Password_Resets` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现邮箱验证服务 (发送验证邮件, 验证邮箱)
      - [ ] 实现密码重置服务 (忘记密码, 重置密码)
      - [ ] 实现密码修改服务 (用户修改密码)
      - [ ] 编写邮箱与密码服务单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现发送邮箱验证 API 端点 (`POST /api/v1/users/me/verify-email/send`)
      - [ ] 实现验证邮箱 API 端点 (`PATCH /api/v1/users/me/verify-email`)
      - [ ] 实现忘记密码 API 端点 (`POST /api/v1/public/forgot-password`)
      - [ ] 实现重置密码 API 端点 (`POST /api/v1/public/reset-password`)
      - [ ] 实现修改密码 API 端点 (`PATCH /api/v1/users/me/password`)
            **(高优先级 - 用户信息管理已包含此 API， 此处再次强调)**
      - [ ] 编写公共 API 端点 (忘记密码, 重置密码) 和 用户 API 端点 (发送/验证邮箱, 修改密码) 单元测试和集成测试
    - [ ] **端到端测试:** 编写邮箱验证和密码重置的端到端测试用例

2.  **两步验证 (Two-Factor Authentication):**
    **(垂直切片开发 - 端到端实现 2FA 启用, 验证, 禁用, 备用码功能)**
    - [ ] **数据层:**
      - [ ] 实现 `Two_Factor_Settings` 和 `Two_Factor_Backup_Codes` 表模型和数据访问方法
      - [ ] 编写 `Two_Factor_Settings` 和 `Two_Factor_Backup_Codes` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现两步验证服务 (启用, 验证, 禁用, 备用码)
      - [ ] 编写两步验证服务单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现启用两步验证 API 端点 (`POST /api/v1/2fa/enable`)
      - [ ] 实现验证两步验证 API 端点 (`POST /api/v1/2fa/verify`)
      - [ ] 实现禁用两步验证 API 端点 (`POST /api/v1/2fa/disable`)
      - [ ] 实现生成备份码 API 端点 (`POST /api/v1/2fa/backup-codes/generate`)
      - [ ] 编写两步验证 API 端点 单元测试和集成测试
    - [ ] **端到端测试:** 编写两步验证功能 (启用, 验证, 禁用, 备用码) 的端到端测试用例

**### 低优先级 (可以延后 - 可选功能, 或非核心功能)**

1.  **单点登录 (Single Sign-On):** **(垂直切片开发 - 端到端实现 SSO 登录流程)**

    - [ ] **数据层:**
      - [ ] 实现 `Login_Methods` 表模型和数据访问方法
      - [ ] 编写 `Login_Methods` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现单点登录服务 (OAuth 提供商集成, 登录流程, 账户关联)
      - [ ] 编写单点登录服务单元测试和集成测试
    - [ ] **API 层:**
      - [ ] 实现 SSO 登录发起 API 端点 (`GET /api/v1/sso/{provider}`)
      - [ ] 实现 SSO 回调 API 端点 (`GET /api/v1/sso/{provider}/callback`)
      - [ ] 编写单点登录 API 端点 单元测试和集成测试
    - [ ] **端到端测试:** 编写单点登录的端到端测试用例

2.  **角色管理 (Role Management):**
    **(非垂直切片 - 可以独立开发， 不需要端到端测试， 主要是后台管理功能)**

    - [ ] **数据层:**
      - [ ] 实现 `Roles` 和 `User_Roles` 表模型和数据访问方法
      - [ ] 编写 `Roles` 和 `User_Roles` 数据层单元测试
    - [ ] **服务层:**
      - [ ] 实现用户角色管理服务 (角色创建, 删除, 分配, 移除)
      - [ ] 编写用户角色管理服务单元测试和集成测试
    - [ ] **API 层:** **(API 端点待定义， 例如后台管理 API 接口)**
      - [ ] 实现角色管理 API 端点 (例如 `GET /api/v1/admin/roles`, `POST /api/v1/admin/roles`,
            `PATCH /api/v1/admin/roles/{id}`, `DELETE /api/v1/admin/roles/{id}`,
            `POST /api/v1/admin/users/{user_id}/roles`)
      - [ ] 编写角色管理 API 端点 单元测试和集成测试

3.  **健康检查 (Health Check):** **(简单功能， 可以随时实现)**
    - [ ] **API 层:**
      - [ ] 实现健康检查 API 端点 (`GET /api/v1/health`)
      - [ ] 编写健康检查 API 端点单元测试

**技术债务与注意事项 (仍然重要)**

您之前列出的技术债务与注意事项依然非常重要， 需要在开发过程中持续关注和解决，并根据项目进展不断补充和完善。

**总结**

这份改进后的 TODO 清单， **更加强调了开发顺序和依赖关系**， 特别是在 **数据层和服务层**
任务的组织上， 力求让您更清晰地了解 **先做什么， 后做什么**。 同时， 在高优先级任务清单中， 我引入了
**垂直切片开发** 的概念， 建议您
**优先端到端地完成核心功能模块**， 以便更早地交付可用功能， 并更快速地验证技术栈和架构。
