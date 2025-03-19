# 认证 API 路由规范 (routes_spec.md)

本文档详细描述了认证 API 的路由、中间件应用、请求/响应示例以及其他相关规范，旨在为开发者提供清晰的 API 实现指南。

---

## 需要路由的 Handler 列表

| 端点路径 | HTTP 方法 | Handler 方法 | 中间件 |
| --- | --- | --- | --- |
| /api/v1/public/register | POST | RegisterHandler | CORS、速率限制 |
| /api/v1/public/forgot-password | POST | ForgotPasswordHandler | CORS、速率限制 |
| /api/v1/public/reset-password | POST | ResetPasswordHandler | CORS、速率限制 |
| /api/v1/auth/login | POST | LoginHandler | CORS、速率限制 |
| /api/v1/auth/token/refresh | POST | RefreshTokenHandler | CORS、速率限制 |
| /api/v1/auth/logout | POST | LogoutHandler | CORS、JWT 验证 |
| /api/v1/users/me | GET | GetMeHandler | CORS、JWT 验证 |
| /api/v1/users/me/password | PATCH | UpdatePasswordHandler | CORS、JWT 验证、速率限制 |
| /api/v1/users/me/verify-email/send | POST | SendVerifyEmailHandler | CORS、JWT 验证、速率限制 |
| /api/v1/users/me/verify-email | PATCH | VerifyEmailHandler | CORS、JWT 验证、速率限制 |
| /api/v1/2fa/enable | POST | Enable2FAHandler | CORS、JWT 验证、速率限制 |
| /api/v1/2fa/verify | POST | Verify2FAHandler | CORS、JWT 验证、速率限制 |
| /api/v1/sso/{provider} | GET | InitiateSSOHandler | CORS、速率限制 |
| /api/v1/sso/{provider}/callback | GET | SSOCallbackHandler | CORS、速率限制 |
| /api/v1/health | GET | HealthCheckHandler | 安全头 |

---

## 请求/响应示例

### 用户注册接口请求示例

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123"
}
```

### 用户注册成功响应示例

```json
{
  "status": "success",
  "data": {
    "user_id": "123",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "message": "User registered successfully",
  "code": "SUCCESS_REGISTER"
}
```

### 用户注册失败响应示例

```json
{
  "status": "error",
  "data": {
    "field": "email",
    "reason": "Email already registered"
  },
  "message": "Registration failed",
  "code": "REG_EMAIL_EXISTS"
}
```

### 登录接口请求示例

```json
{
  "username": "johndoe",
  "password": "Password123",
  "two_factor_code": "123456"
}
```

### 登录成功响应示例

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

### 登录失败响应示例

```json
{
  "status": "error",
  "data": null,
  "message": "Invalid username, password, or 2FA code",
  "code": "INVALID_CREDENTIALS"
}
```

---

## 中间件应用顺序

1.  安全头中间件（强制 HTTPS/HSTS）
2.  CORS 中间件（根据配置处理跨域）
3.  速率限制中间件（基于 IP/账户的限流）
4.  JWT 验证中间件（Bearer Token 解析）

---

## 状态码映射表

| HTTP 状态码 | 业务场景 |
| --- | --- |
| 200 OK | 成功请求 |
| 201 Created | 资源创建成功 |
| 302 Found | 重定向 |
| 400 Bad Request | 请求参数验证失败 |
| 401 Unauthorized | JWT 验证失败/过期 |
| 403 Forbidden | 权限不足 |
| 429 Too Many Requests | 触发速率限制 |
| 503 Service Unavailable | 服务不可用 |

---

## 接口分组规则

1.  **公共接口**（注册/忘记密码/重置密码/登录/SSO）：
    * 必须包含 CORS 和速率限制中间件
    * 响应头必须包含 `Access-Control-Expose-Headers: X-RateLimit-*`
2.  **认证接口**（用户信息/令牌刷新/登出）：
    * 必须包含 JWT 验证中间件
    * 启用 X-Request-ID 追踪
3.  **敏感操作**（两步验证/修改密码/邮箱验证）：
    * 强制要求 Content-Type: application/json
    * 增加速率限制

---

## 中间件配置参考

```go
// CORS 中间件配置示例（internal/handlers/middleware/cors_middleware.go）
corsConfig := middleware.CORSConfig{
    AllowedOrigins:   []string{"https://*.example.com"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
    AllowCredentials: true,
    MaxAge:           300,
}
```
---

## 路由注册规范

1.  按功能模块分组注册路由
2.  中间件链应用顺序：
    ```go
    router.Group("/api/v1")
        .Use(middleware.SecurityHeaders())
        .Use(middleware.CORS())
        .Use(middleware.RateLimiter())
        .Use(middleware.JWT())
    ```
3.  敏感操作路由强制要求 `Content-Type: application/json`
4.  根据接口分组规则应用中间件
