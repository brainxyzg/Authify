创建一个 Go API 项目，遵循以下最佳实践，并针对 Google Cloud 部署和免费数据库进行优化：

1.  **项目结构：**
    * 使用清晰的模块化结构，将代码组织到不同的包中，例如：
        * `cmd/`: 应用程序的入口点。
        * `internal/`: 包含应用程序的核心逻辑。
            * `api/`: 定义 API 路由和处理程序。
            * `data/`: 包含数据访问层（使用 sqlx 连接到 Cloud SQL）。
            * `service/`: 包含业务逻辑服务。
            * `model/`: 定义数据模型。
            * `config/`: 包含配置管理。
        * `pkg/`: 可重用的库代码（可选）。
    * 使用 Go Modules 管理依赖项。

2.  **API 设计：**
    * 使用 RESTful API 设计原则。
    * 使用 JSON 作为数据交换格式。
    * 使用清晰的 URL 路径和 HTTP 方法。
    * 使用适当的 HTTP 状态码。
    * 使用 OpenAPI (Swagger) 定义 API 文档。

3.  **数据访问：**
    * 使用 Google Cloud SQL（MySQL 免费层）作为数据库。
    * 使用 sqlx 库连接到 Cloud SQL。
    * 使用依赖注入来管理数据库连接。
    * 编写可测试的数据访问代码。

4.  **服务层：**
    * 将业务逻辑与 API 处理程序分离。
    * 使用接口定义服务。
    * 编写可测试的服务代码。

5.  **配置管理：**
    * 使用环境变量存储非敏感配置（例如，端口号、环境名称）。
    * 使用 Google Cloud Secret Manager 存储敏感信息（例如，数据库密码、JWT 密钥）。
    * 使用 viper 库处理配置文件和环境变量。

6.  **日志记录：**
    * 使用结构化日志记录（例如，logrus、zap）。
    * 记录关键事件和错误。
    * 集成 Google Cloud Logging。

7.  **错误处理：**
    * 使用自定义错误类型。
    * 返回有意义的错误消息。
    * 使用中间件处理全局错误。

8.  **测试：**
    * 编写单元测试和集成测试。
    * 使用 testify 库进行断言。
    * 使用模拟来隔离测试依赖项。

9.  **依赖注入：**
    * 使用 wire 库进行依赖注入。

10. **代码风格：**
    * 遵循 Go 代码风格指南。
    * 使用 gofmt 和 golint 进行代码格式化和静态分析。

11. **web框架**:
    * 使用gin框架。

12. **数据库**:
    * 使用Google Cloud SQL（MySQL 免费层）。

13. **鉴权**:
    * 使用jwt鉴权。

14. **Dockerfile**:
    * 添加 Dockerfile 文件，方便 Docker 部署到 Google Cloud Run。
    * 添加 Cloud Build 配置文件 (cloudbuild.yaml)，用于自动化构建和部署。

15. **Google Cloud 集成：**
    * 使用 Google Cloud SDK 进行身份验证和授权。
    * 配置应用程序以在 Google Cloud Run 上运行。
    * 使用 Google Cloud Secret Manager 存储敏感信息（例如，数据库凭据）。
    * 在cloud run 的服务配置中给与cloud run 读取secret manager的权限。

请为我生成一个项目模板，包含上述最佳实践的示例代码，并针对 Google Cloud 部署和免费数据库进行优化，明确使用 sqlx 连接到 Cloud SQL。