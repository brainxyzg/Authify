# Authify - 现代化身份认证与授权系统

Authify 是一个基于 NestJS 构建的完整身份认证与授权解决方案，提供安全、可扩展的用户管理系统，支持多种认证方式和精细的权限控制。

![Coverage](https://codecov.io/gh/brainxyzg/authify/branch/main/graph/badge.svg?token=YOUR_CODECOV_TOKEN)  
![Build Status](https://github.com/brainxyzg/authify/actions/workflows/test.yml/badge.svg)
## 功能特点

- **多种认证方式**：支持用户名/密码、邮箱验证、OAuth2.0 社交登录（Google、GitHub 等）
- **JWT 认证**：使用 JWT 进行无状态身份验证，支持访问令牌和刷新令牌
- **角色权限管理**：基于角色的访问控制 (RBAC)，灵活定义用户权限
- **安全防护**：防止常见安全威胁，如 CSRF、XSS、SQL 注入等
- **用户管理**：完整的用户生命周期管理，包括注册、验证、密码重置等
- **高性能缓存**：集成 Redis 缓存，提高系统响应速度
- **可扩展 API**：RESTful API 设计，易于集成到各类应用中

## 技术栈

- **后端框架**：NestJS
- **数据库**：PostgreSQL
- **缓存**：Redis
- **认证**：JWT, OAuth2.0
- **API 文档**：Swagger/OpenAPI
- **测试**：Jest

## 快速开始

### 前置条件

- Node.js (>= 16.x)
- Docker 和 Docker Compose
- PostgreSQL
- Redis

### 使用 Docker 启动开发环境

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d
```

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 根据需要修改 .env 文件中的配置
```

### 运行应用

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 运行测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## API 文档

启动应用后，访问 `http://localhost:3000/api/docs` 查看 Swagger API 文档。

## 项目结构

```
src/
├── auth/             # 认证相关模块
├── common/           # 公共组件、实体和工具
├── config/           # 配置模块
├── sso/              # 社交登录模块
├── user/             # 用户管理模块
├── app.module.ts     # 应用主模块
└── main.ts           # 应用入口
```

## 部署

### 使用 Docker 部署

```bash
# 构建 Docker 镜像
docker build -t authify .

# 运行容器
docker run -p 3000:3000 --env-file .env authify
```

### 环境变量配置

部署时需要配置的关键环境变量：

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`: 数据库连接信息
- `REDIS_HOST`, `REDIS_PORT`: Redis 连接信息
- `JWT_SECRET`: JWT 签名密钥
- 社交登录相关配置: `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID` 等

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过 Issues 或 Pull Requests 与我们联系。
