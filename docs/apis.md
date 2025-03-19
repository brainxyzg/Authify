以下是根据前述对比分析和改进建议，合并并优化后的 **完整版认证 API 文档**。该文档涵盖了 Authify 项目的所有端点，遵循 RESTful 最佳实践，统一响应结构，确保一致性、清晰性、安全性，并补充了所有遗漏的功能（如两步验证扩展和角色管理）。每个端点的描述、参数约束、响应示例和调用示例都经过完善。

---

```markdown
# 认证 API 文档 (完整版)

本文档描述了 Authify 项目中的认证系统，基于 RESTful 原则设计，所有端点位于 `/api/v1` 下。接口按功能模块分为公共端点（`/public`）、认证管理（`/auth`）、用户资源（`/users`）、两步验证（`/2fa`）、单点登录（`/sso`）、健康检查（`/health`）和角色管理（`/admin/roles`）。文档提供版本管理说明、强化的安全建议、详细的字段数据字典、完善的调用示例及精确的 HTTP 状态码说明，确保开发者能够安全、高效地接入 API。

---

## 版本管理说明
- **当前版本**: `v1`，所有 URL 以 `/api/v1` 开头。
- **向后兼容性**: 非破坏性更新将新增端点或扩展字段，保持现有功能的兼容性；重大更改或功能移除将发布新版本（如 `/api/v2`）。
- **版本控制策略**: 强烈建议在请求 URL 中明确指定版本，并订阅变更日志以获取更新通知。

---

## 安全性说明 (重要)

**安全性是本系统的核心，请严格遵守以下建议：**

- **HTTPS 强制**: **所有请求必须通过 HTTPS 协议发送**，防止数据泄露和中间人攻击。**禁用 HTTP 访问**。
- **CORS 策略**: **配置严格的跨域资源共享 (CORS) 策略**，仅允许受信任域名访问 API，降低 CSRF 风险。
- **身份验证**: **受保护端点需在请求头中包含 `Authorization: Bearer <token>`**，token 需验证签名和黑名单状态。**妥善存储 token，避免泄露**。
- **API 密钥/客户端凭证**: **建议使用 API 密钥或 OAuth 2.0 客户端凭证**进行第三方集成，密钥应存储在安全环境变量中。
- **速率限制**: **所有端点均启用速率限制**，超出限制返回 `429 Too Many Requests`。请合理控制请求频率。
- **令牌黑名单**: **登出或刷新时旧令牌将加入黑名单（如 Redis）并失效**，确保令牌泄露后无法使用。

---

## 字段数据字典

所有 API 响应遵循以下结构：
- `status` (字符串, 枚举: `"success"`, `"error"`): **必填**。请求结果状态。
- `data` (对象或 null): **必填**。成功时的响应数据或错误时的详细信息。
- `message` (字符串, 1-255 字符): **必填**。请求结果描述，支持国际化。
- `code` (字符串, 5-50 字符, 大写下划线命名): **必填**。成功或错误代码，用于调试和程序化处理。

可选字段：
- `timestamp` (字符串, ISO 8601 格式, 示例: `"2025-03-17T12:00:00Z"`): 响应时间戳，健康检查端点中推荐返回。

---

## HTTP 状态码说明

| HTTP 状态码 | 含义                | 适用场景                                     |
|-------------|---------------------|----------------------------------------------|
| 200         | OK                  | 请求成功，返回预期结果（如登录、获取用户信息）。 |
| 201         | Created             | 资源创建成功（如用户注册、角色创建）。         |
| 204         | No Content          | 请求成功，无响应体（如禁用 2FA）。             |
| 302         | Found               | 重定向（如 SSO 登录发起至第三方授权页面）。     |
| 400         | Bad Request         | 请求参数错误（如缺失字段、格式无效）。         |
| 401         | Unauthorized        | 未授权（如 token 无效或黑名单中）。            |
| 403         | Forbidden           | 权限不足（如无管理员权限访问角色管理）。       |
| 429         | Too Many Requests   | 请求频率超限。                                 |
| 503         | Service Unavailable | 服务不可用（如数据库故障）。                   |

---

## 1. 公共端点（无需认证） - Public Endpoints

### 1.1 用户注册 - User Registration
- **端点**: `POST /api/v1/public/register`
- **描述**: 创建新用户账户。
- **请求方法**: `POST`
- **请求体**: `application/json`
- **请求参数**:
  - `username` (字符串, 3-50 字符, 正则: `^[a-zA-Z0-9_]+$`): **必填**。唯一用户名，仅限字母、数字和下划线。
  - `email` (字符串, 5-255 字符, RFC 5322 格式): **必填**。唯一邮箱地址。
  - `password` (字符串, 8-128 字符, 正则: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$`): **必填**。密码，需含大写、小写和数字。
- **成功响应** - `HTTP 201 Created`:
  ```json
  {
    "status": "success",
    "data": {"user_id": "123", "username": "johndoe", "email": "john@example.com"},
    "message": "User registered successfully",
    "code": "SUCCESS_REGISTER"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "email", "reason": "Email already registered"},
      "message": "Registration failed",
      "code": "REG_EMAIL_EXISTS"
    }
    ```
  - `HTTP 429 Too Many Requests`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Too many requests",
      "code": "RATE_LIMIT_EXCEEDED"
    }
    ```
- **速率限制**: 10 次/IP/分钟。
- **安全提示**: **使用 HTTPS 保护密码**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/public/register \
    -H "Content-Type: application/json" \
    -d '{"username": "johndoe", "email": "john@example.com", "password": "Passw0rd123"}'
  ```

### 1.2 忘记密码 - Forgot Password
- **端点**: `POST /api/v1/public/forgot-password`
- **描述**: 发送密码重置邮件。
- **请求方法**: `POST`
- **请求体**: `application/json`
- **请求参数**:
  - `email` (字符串, 5-255 字符, RFC 5322 格式): **必填**。用户邮箱。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Password reset email sent",
    "code": "SUCCESS_FORGOT_PASSWORD"
  }
  ```
- **错误响应**:
  - `HTTP 429 Too Many Requests`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Too many requests",
      "code": "RATE_LIMIT_EXCEEDED"
    }
    ```
- **速率限制**: 3 次/邮箱/小时。
- **安全提示**: **邮件链接使用 HTTPS**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/public/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email": "john@example.com"}'
  ```

### 1.3 重置密码 - Reset Password
- **端点**: `POST /api/v1/public/reset-password`
- **描述**: 使用重置令牌更新密码。
- **请求方法**: `POST`
- **请求体**: `application/json`
- **请求参数**:
  - `token` (字符串, 32-64 字符, 字母数字): **必填**。密码重置令牌。
  - `new_password` (字符串, 8-128 字符, 正则: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$`): **必填**。新密码。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Password reset successfully",
    "code": "SUCCESS_RESET_PASSWORD"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Invalid or expired reset token",
      "code": "INVALID_RESET_TOKEN"
    }
    ```
- **速率限制**: 5 次/令牌/小时。
- **安全提示**: **令牌一次性使用**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/public/reset-password \
    -H "Content-Type: application/json" \
    -d '{"token": "resetToken123", "new_password": "NewPass123"}'
  ```

---

## 2. 认证端点（令牌管理） - Authentication Endpoints

### 2.1 用户登录 - User Login
- **端点**: `POST /api/v1/auth/login`
- **描述**: 验证用户身份并颁发令牌，支持可选 2FA。
- **请求方法**: `POST`
- **请求体**: `application/json`
- **请求参数**:
  - `username` (字符串, 3-50 字符, 正则: `^[a-zA-Z0-9_]+$`): **必填**。用户名。
  - `password` (字符串, 8-128 字符): **必填**。密码。
  - `two_factor_code` (字符串, 6 位数字, 正则: `^\d{6}$`): **可选**，启用 2FA 时必填。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "xyz",
      "token_type": "bearer",
      "refresh_token": "abc",
      "expires_in": 3600
    },
    "message": "Login successful",
    "code": "SUCCESS_LOGIN"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Invalid username, password, or 2FA code",
      "code": "INVALID_CREDENTIALS"
    }
    ```
- **速率限制**: 5 次失败尝试/用户名/IP/15分钟。
- **安全提示**: **使用 HTTPS 传输**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "johndoe", "password": "Passw0rd123", "two_factor_code": "123456"}'
  ```

### 2.2 刷新访问令牌 - Refresh Access Token
- **端点**: `POST /api/v1/auth/token/refresh`
- **描述**: 使用刷新令牌获取新访问令牌。
- **请求方法**: `POST`
- **请求体**: `application/json`
- **请求参数**:
  - `refresh_token` (字符串, 32-128 字符, 字母数字): **必填**。刷新令牌。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "new_xyz",
      "token_type": "bearer",
      "refresh_token": "new_abc",
      "expires_in": 3600
    },
    "message": "Token refreshed successfully",
    "code": "SUCCESS_REFRESH_TOKEN"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Invalid or expired refresh token",
      "code": "INVALID_REFRESH_TOKEN"
    }
    ```
- **速率限制**: 20 次/用户/小时。
- **安全提示**: **旧令牌加入黑名单**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/auth/token/refresh \
    -H "Content-Type: application/json" \
    -d '{"refresh_token": "abc"}'
  ```

### 2.3 登出 - Logout
- **端点**: `POST /api/v1/auth/logout`
- **描述**: 失效当前访问令牌和刷新令牌。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Logged out successfully",
    "code": "SUCCESS_LOGOUT"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Invalid or already logged out",
      "code": "INVALID_TOKEN"
    }
    ```
- **安全提示**: **令牌加入黑名单**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/auth/logout \
    -H "Authorization: Bearer xyz"
  ```

---

## 3. 用户端点（需要认证） - User Endpoints

### 3.1 获取当前用户信息 - Get Current User Info
- **端点**: `GET /api/v1/users/me`
- **描述**: 获取当前用户信息。
- **请求方法**: `GET`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "user_id": "123",
      "username": "johndoe",
      "email": "john@example.com",
      "roles": ["user"],
      "is_email_verified": false,
      "two_factor_enabled": false
    },
    "message": "User info retrieved successfully",
    "code": "SUCCESS_GET_USER_INFO"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Unauthorized",
      "code": "UNAUTHORIZED"
    }
    ```
- **安全提示**: **验证 token 有效性**。
- **调用示例**:
  ```bash
  curl -X GET https://api.example.com/api/v1/users/me \
    -H "Authorization: Bearer xyz"
  ```

### 3.2 更新用户信息 - Update User Info
- **端点**: `PATCH /api/v1/users/me`
- **描述**: 更新当前用户的通用信息（如用户名）。
- **请求方法**: `PATCH`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **请求体**: `application/json`
- **请求参数**:
  - `username` (字符串, 3-50 字符, 正则: `^[a-zA-Z0-9_]+$`, 可选): 新用户名。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"username": "newjohndoe"},
    "message": "User info updated successfully",
    "code": "SUCCESS_UPDATE_USER_INFO"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "username", "reason": "Username already taken"},
      "message": "Update failed",
      "code": "USERNAME_TAKEN"
    }
    ```
- **速率限制**: 5 次/用户/小时。
- **安全提示**: **验证权限和唯一性**。
- **调用示例**:
  ```bash
  curl -X PATCH https://api.example.com/api/v1/users/me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"username": "newjohndoe"}'
  ```

### 3.3 修改密码 - Change Password
- **端点**: `PATCH /api/v1/users/me/password`
- **描述**: 更新当前用户密码。
- **请求方法**: `PATCH`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **请求体**: `application/json`
- **请求参数**:
  - `old_password` (字符串, 8-128 字符): **必填**。当前密码。
  - `new_password` (字符串, 8-128 字符, 正则: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$`): **必填**。新密码。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Password updated successfully",
    "code": "SUCCESS_UPDATE_PASSWORD"
  }
  ```
- **错误响应**:
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Incorrect old password",
      "code": "INCORRECT_PASSWORD"
    }
    ```
- **速率限制**: 5 次/用户/小时。
- **安全提示**: **避免密码重用**。
- **调用示例**:
  ```bash
  curl -X PATCH https://api.example.com/api/v1/users/me/password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"old_password": "Passw0rd123", "new_password": "NewPass123"}'
  ```

### 3.4 发送邮箱验证邮件 - Send Email Verification Email
- **端点**: `POST /api/v1/users/me/verify-email/send`
- **描述**: 发送邮箱验证邮件。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Verification email sent",
    "code": "SUCCESS_SEND_VERIFY_EMAIL"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Email already verified",
      "code": "EMAIL_ALREADY_VERIFIED"
    }
    ```
- **速率限制**: 3 次/用户/天。
- **安全提示**: **邮件链接使用 HTTPS**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/users/me/verify-email/send \
    -H "Authorization: Bearer xyz"
  ```

### 3.5 验证邮箱 - Verify Email
- **端点**: `PATCH /api/v1/users/me/verify-email`
- **描述**: 使用验证码验证邮箱。
- **请求方法**: `PATCH`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **请求体**: `application/json`
- **请求参数**:
  - `code` (字符串, 6 字符, 正则: `^[a-zA-Z0-9]{6}$`): **必填**。邮箱验证码。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"is_email_verified": true},
    "message": "Email verified successfully",
    "code": "SUCCESS_VERIFY_EMAIL"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "code", "reason": "Invalid or expired code"},
      "message": "Verification failed",
      "code": "INVALID_CODE"
    }
    ```
- **速率限制**: 10 次/用户/小时。
- **安全提示**: **验证后令牌失效**。
- **调用示例**:
  ```bash
  curl -X PATCH https://api.example.com/api/v1/users/me/verify-email \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"code": "ABC123"}'
  ```

---

## 4. 两步验证端点（需要认证） - Two-Factor Authentication Endpoints

### 4.1 启用两步验证 - Enable 2FA
- **端点**: `POST /api/v1/2fa/enable`
- **描述**: 发起 2FA 设置，返回密钥和二维码。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "secret": "JBSWY3DPEHPK3PXP",
      "qr_code_url": "https://example.com/qr/123",
      "backup_codes": ["12345678", "87654321"]
    },
    "message": "2FA setup initiated, verify to activate",
    "code": "SUCCESS_INIT_2FA"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "2FA already enabled",
      "code": "2FA_ALREADY_ENABLED"
    }
    ```
- **速率限制**: 3 次/用户/天。
- **安全提示**: **备份码需安全存储**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/2fa/enable \
    -H "Authorization: Bearer xyz"
  ```

### 4.2 验证两步验证 - Verify 2FA
- **端点**: `POST /api/v1/2fa/verify`
- **描述**: 激活 2FA。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **请求体**: `application/json`
- **请求参数**:
  - `code` (字符串, 6 位数字, 正则: `^\d{6}$`): **必填**。认证器验证码。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"two_factor_enabled": true},
    "message": "2FA activated successfully",
    "code": "SUCCESS_VERIFY_2FA"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "code", "reason": "Invalid 2FA code"},
      "message": "Verification failed",
      "code": "INVALID_2FA_CODE"
    }
    ```
- **速率限制**: 10 次/用户/小时。
- **安全提示**: **验证后启用 2FA**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/2fa/verify \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"code": "654321"}'
  ```

### 4.3 禁用两步验证 - Disable 2FA
- **端点**: `POST /api/v1/2fa/disable`
- **描述**: 禁用当前用户的 2FA。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 204 No Content`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "2FA disabled successfully",
    "code": "SUCCESS_DISABLE_2FA"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "2FA not enabled",
      "code": "2FA_NOT_ENABLED"
    }
    ```
- **速率限制**: 3 次/用户/天。
- **安全提示**: **禁用后需重新验证身份**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/2fa/disable \
    -H "Authorization: Bearer xyz"
  ```

### 4.4 生成备份码 - Generate 2FA Backup Codes
- **端点**: `POST /api/v1/2fa/backup-codes/generate`
- **描述**: 生成新的 2FA 备份码。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"backup_codes": ["98765432", "23456789"]},
    "message": "Backup codes generated successfully",
    "code": "SUCCESS_GENERATE_BACKUP_CODES"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "2FA not enabled",
      "code": "2FA_NOT_ENABLED"
    }
    ```
- **速率限制**: 3 次/用户/天。
- **安全提示**: **备份码需安全存储**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/2fa/backup-codes/generate \
    -H "Authorization: Bearer xyz"
  ```

---

## 5. 单点登录端点（混合访问） - Single Sign-On Endpoints

### 5.1 发起 SSO 登录 - Initiate SSO Login
- **端点**: `GET /api/v1/sso/{provider}`
- **描述**: 发起 SSO 登录，重定向至提供商授权页面。
- **请求方法**: `GET`
- **路径参数**:
  - `provider` (字符串, 枚举: `"google"`, `"github"`, 5-20 字符): **必填**。SSO 提供商。
- **成功响应** - `HTTP 302 Found`:
  - **Header**: `Location: <provider_auth_url>`。
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "provider", "reason": "Unsupported provider"},
      "message": "Invalid provider",
      "code": "INVALID_PROVIDER"
    }
    ```
- **速率限制**: 10 次/IP/分钟。
- **安全提示**: **使用 HTTPS 重定向**。
- **调用示例**:
  ```bash
  curl -X GET https://api.example.com/api/v1/sso/google -L
  ```

### 5.2 SSO 回调 - SSO Callback
- **端点**: `GET /api/v1/sso/{provider}/callback`
- **描述**: 处理 SSO 提供商回调，颁发令牌和用户信息。
- **请求方法**: `GET`
- **路径参数**:
  - `provider` (字符串, 枚举: `"google"`, `"github"`, 5-20 字符): **必填**。
- **查询参数**:
  - `code` (字符串, 10-255 字符): **必填**。授权码。
  - `state` (字符串, 32-128 字符): **可选但强烈建议**。CSRF 防护状态参数。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "xyz",
      "token_type": "bearer",
      "refresh_token": "abc",
      "expires_in": 3600,
      "user": {"username": "johndoe", "email": "john@example.com"}
    },
    "message": "SSO login successful",
    "code": "SUCCESS_SSO_LOGIN"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "code", "reason": "Invalid authorization code"},
      "message": "SSO login failed",
      "code": "INVALID_SSO_CODE"
    }
    ```
- **速率限制**: 10 次/IP/分钟。
- **安全提示**: **验证 state 参数防 CSRF**。
- **调用示例**:
  ```bash
  curl -X GET "https://api.example.com/api/v1/sso/google/callback?code=authCode&state=csrfState"
  ```

---

## 6. 健康检查端点 - Health Check Endpoint

### 6.1 健康检查 - Health Check
- **端点**: `GET /api/v1/health`
- **描述**: 检查服务及其依赖的健康状况。
- **请求方法**: `GET`
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {
      "overall": "healthy",
      "database": "ok",
      "cache": "ok"
    },
    "message": "Service is operational",
    "timestamp": "2025-03-17T12:00:00Z",
    "code": "SUCCESS_HEALTH_CHECK"
  }
  ```
- **错误响应** - `HTTP 503 Service Unavailable`:
  ```json
  {
    "status": "error",
    "data": {"component": "database", "reason": "Connection failed"},
    "message": "Service unavailable",
    "code": "SERVICE_UNAVAILABLE"
  }
  ```
- **安全提示**: **避免暴露敏感信息**。
- **调用示例**:
  ```bash
  curl -X GET https://api.example.com/api/v1/health
  ```

---

## 7. 角色管理端点（需要认证及管理员权限） - Role Management Endpoints

### 7.1 获取角色列表 - Get Role List
- **端点**: `GET /api/v1/admin/roles`
- **描述**: 获取所有角色列表。
- **请求方法**: `GET`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**，需管理员权限。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": [
      {"id": "1", "name": "admin", "description": "Administrator"},
      {"id": "2", "name": "user", "description": "Regular user"}
    ],
    "message": "Roles retrieved successfully",
    "code": "SUCCESS_GET_ROLES"
  }
  ```
- **错误响应**:
  - `HTTP 403 Forbidden`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Insufficient permissions",
      "code": "FORBIDDEN"
    }
    ```
- **安全提示**: **限制管理员访问**。
- **调用示例**:
  ```bash
  curl -X GET https://api.example.com/api/v1/admin/roles \
    -H "Authorization: Bearer xyz"
  ```

### 7.2 创建角色 - Create Role
- **端点**: `POST /api/v1/admin/roles`
- **描述**: 创建新角色。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**，需管理员权限。
- **请求体**: `application/json`
- **请求参数**:
  - `name` (字符串, 3-50 字符, 正则: `^[a-zA-Z0-9_]+$`): **必填**。角色名称。
  - `description` (字符串, 0-255 字符): **可选**。角色描述。
- **成功响应** - `HTTP 201 Created`:
  ```json
  {
    "status": "success",
    "data": {"id": "3", "name": "moderator", "description": "Moderator role"},
    "message": "Role created successfully",
    "code": "SUCCESS_CREATE_ROLE"
  }
  ```
- **错误响应**:
  - `HTTP 400 Bad Request`:
    ```json
    {
      "status": "error",
      "data": {"field": "name", "reason": "Role already exists"},
      "message": "Role creation failed",
      "code": "ROLE_EXISTS"
    }
    ```
- **安全提示**: **验证唯一性**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/admin/roles \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"name": "moderator", "description": "Moderator role"}'
  ```

### 7.3 更新角色 - Update Role
- **端点**: `PATCH /api/v1/admin/roles/{id}`
- **描述**: 更新指定角色的信息。
- **请求方法**: `PATCH`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**，需管理员权限。
- **路径参数**:
  - `id` (字符串, 1-20 字符): **必填**。角色 ID。
- **请求体**: `application/json`
- **请求参数**:
  - `name` (字符串, 3-50 字符, 正则: `^[a-zA-Z0-9_]+$`, 可选): 新角色名称。
  - `description` (字符串, 0-255 字符, 可选): 新描述。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"id": "3", "name": "mod", "description": "Updated moderator role"},
    "message": "Role updated successfully",
    "code": "SUCCESS_UPDATE_ROLE"
  }
  ```
- **错误响应**:
  - `HTTP 404 Not Found`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Role not found",
      "code": "ROLE_NOT_FOUND"
    }
    ```
- **安全提示**: **验证权限**。
- **调用示例**:
  ```bash
  curl -X PATCH https://api.example.com/api/v1/admin/roles/3 \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"name": "mod", "description": "Updated moderator role"}'
  ```

### 7.4 删除角色 - Delete Role
- **端点**: `DELETE /api/v1/admin/roles/{id}`
- **描述**: 删除指定角色。
- **请求方法**: `DELETE`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**，需管理员权限。
- **路径参数**:
  - `id` (字符串, 1-20 字符): **必填**。角色 ID。
- **成功响应** - `HTTP 204 No Content`:
  ```json
  {
    "status": "success",
    "data": null,
    "message": "Role deleted successfully",
    "code": "SUCCESS_DELETE_ROLE"
  }
  ```
- **错误响应**:
  - `HTTP 404 Not Found`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "Role not found",
      "code": "ROLE_NOT_FOUND"
    }
    ```
- **安全提示**: **检查角色是否在使用**。
- **调用示例**:
  ```bash
  curl -X DELETE https://api.example.com/api/v1/admin/roles/3 \
    -H "Authorization: Bearer xyz"
  ```

### 7.5 为用户分配角色 - Assign Role to User
- **端点**: `POST /api/v1/admin/users/{user_id}/roles`
- **描述**: 为指定用户分配角色。
- **请求方法**: `POST`
- **请求头**:
  - `Authorization: Bearer <token>` (字符串, 32-128 字符): **必填**，需管理员权限。
- **路径参数**:
  - `user_id` (字符串, 1-20 字符): **必填**。用户 ID。
- **请求体**: `application/json`
- **请求参数**:
  - `role_id` (字符串, 1-20 字符): **必填**。角色 ID。
- **成功响应** - `HTTP 200 OK`:
  ```json
  {
    "status": "success",
    "data": {"user_id": "123", "role_id": "3"},
    "message": "Role assigned successfully",
    "code": "SUCCESS_ASSIGN_ROLE"
  }
  ```
- **错误响应**:
  - `HTTP 404 Not Found`:
    ```json
    {
      "status": "error",
      "data": null,
      "message": "User or role not found",
      "code": "USER_OR_ROLE_NOT_FOUND"
    }
    ```
- **安全提示**: **验证管理员权限**。
- **调用示例**:
  ```bash
  curl -X POST https://api.example.com/api/v1/admin/users/123/roles \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer xyz" \
    -d '{"role_id": "3"}'
  ```

---

### 完整性
此文档已覆盖 Authify 项目清单中的所有端点：
1. **公共端点**: 3 个，全部包含。
2. **认证端点**: 3 个，调整为 `POST /api/v1/auth/token/refresh`，一致。
3. **用户端点**: 5 个，新增 `PATCH /api/v1/users/me`，统一密码修改为 `PATCH /api/v1/users/me/password`。
4. **两步验证端点**: 4 个，补充 `disable` 和 `backup-codes/generate`。
5. **SSO 端点**: 2 个，完全一致。
6. **健康检查端点**: 1 个，完全一致。
7. **角色管理端点**: 5 个，作为可选功能完整补充。

### 亮点
- **一致性**: 所有响应遵循 `{status, data, message, code}`。
- **清晰性**: 参数约束明确（类型、长度、正则）。
- **安全性**: 强化 HTTPS、CORS、token 管理。
- **调用示例**: 完整且可执行。
- **状态码**: 细化适用场景。
