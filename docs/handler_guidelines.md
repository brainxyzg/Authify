# Handler 编写规范

本文档提供了 Authify 项目 Handler 的编写规范，新增 Handler 可以按照此规范进行开发。

## 1. 基本结构

每个 Handler 函数应遵循以下基本结构：

```go
// HandlerName 处理XXX请求
func (h *Handler) HandlerName(w http.ResponseWriter, r *http.Request) {
    // 1. 请求体大小限制
    // 2. HTTP 方法验证
    // 3. 请求解析
    // 4. 参数验证
    // 5. 业务逻辑处理
    // 6. 响应返回
}
```

## 2. 请求处理规范

### 2.1 请求体大小限制

所有接收请求体的 Handler 必须限制请求体大小：

```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 限制请求体大小为1MB
```

### 2.2 HTTP 方法验证

明确指定允许的 HTTP 方法：

```go
if r.Method != http.MethodPost {
    w.WriteHeader(http.StatusMethodNotAllowed)
    json.NewEncoder(w).Encode(models.NewErrorResponse("方法不允许", "METHOD_NOT_ALLOWED"))
    return
}
```

### 2.3 请求解析

使用 `DisallowUnknownFields` 防止客户端发送多余数据：

```go
var req RequestStruct
decoder := json.NewDecoder(r.Body)
decoder.DisallowUnknownFields() // 不允许未知字段

if err := decoder.Decode(&req); err != nil {
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(models.NewErrorResponse("无效的请求格式", "INVALID_REQUEST_FORMAT"))
    return
}
```

### 2.4 参数验证

将验证逻辑分离到单独的函数中：

```go
if err := h.validateRequestStruct(&req); err != nil {
    if validationErr, ok := err.(*ValidationError); ok {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(models.NewErrorResponse(
            validationErr.Message,
            "VALIDATION_ERROR_CODE",
        ))
        return
    }
}
```

### 2.5 业务逻辑处理

调用 Service 层处理业务逻辑，并进行错误处理：

```go
result, err := h.services.SomeService.SomeOperation(req.Param1, req.Param2)
if err != nil {
    // 添加日志记录
    log.Printf("操作失败: %v", err)

    // 根据错误类型返回不同的响应
    if err.Error() == "特定错误信息" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(models.NewErrorResponse("用户友好的错误信息", "ERROR_CODE"))
        return
    }

    // 其他错误作为内部错误处理
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(models.NewErrorResponse("操作失败", "INTERNAL_ERROR"))
    return
}
```

### 2.6 响应返回

使用统一的响应格式：

```go
w.WriteHeader(http.StatusOK) // 或其他适当的状态码
json.NewEncoder(w).Encode(models.NewSuccessResponse(
    map[string]interface{}{
        "key1": result.Value1,
        "key2": result.Value2,
    },
    "操作成功",
    "SUCCESS_CODE",
))
```

## 3. 验证函数规范

为每个请求结构体创建对应的验证函数：

```go
// validateRequestStruct 验证请求参数
func (h *Handler) validateRequestStruct(req *RequestStruct) error {
    // 使用预定义的常量和正则表达式进行验证
    if len(req.Field) < MinFieldLength || len(req.Field) > MaxFieldLength {
        return NewValidationError("field", "字段长度必须在X-Y个字符之间")
    }

    if !fieldRegex.MatchString(req.Field) {
        return NewValidationError("field", "字段格式无效")
    }

    return nil
}
```

## 4. 日志记录规范

在关键操作和错误处理中添加日志记录：

```go
// 记录请求开始
log.Printf("开始处理 %s 请求: %s", r.Method, r.URL.Path)

// 记录错误
if err != nil {
    log.Printf("处理请求失败: %v", err)
}

// 记录请求完成
log.Printf("请求处理完成，状态码: %d", http.StatusOK)
```

## 5. 安全处理规范

### 5.1 敏感数据处理

不要在日志中记录敏感信息（密码、令牌等）：

```go
// 正确示例
log.Printf("用户 %s 尝试登录", req.Username)

// 错误示例
log.Printf("用户 %s 使用密码 %s 尝试登录", req.Username, req.Password)
```

### 5.2 输入验证

对所有用户输入进行严格验证，使用预定义的正则表达式和长度限制。

## 6. 示例模板

以下是一个完整的 Handler 示例模板：

```go
// ExampleHandler 处理示例请求
func (h *Handler) ExampleHandler(w http.ResponseWriter, r *http.Request) {
    // 限制请求体大小
    r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

    // 验证HTTP方法
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(models.NewErrorResponse("方法不允许", "METHOD_NOT_ALLOWED"))
        return
    }

    // 解析请求体
    var req ExampleRequest
    decoder := json.NewDecoder(r.Body)
    decoder.DisallowUnknownFields()

    if err := decoder.Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(models.NewErrorResponse("无效的请求格式", "INVALID_REQUEST_FORMAT"))
        return
    }

    // 验证请求参数
    if err := h.validateExampleRequest(&req); err != nil {
        if validationErr, ok := err.(*ValidationError); ok {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(models.NewErrorResponse(
                validationErr.Message,
                "EXAMPLE_VALIDATION_ERROR",
            ))
            return
        }
    }

    // 处理业务逻辑
    result, err := h.services.SomeService.SomeOperation(req.Param)
    if err != nil {
        log.Printf("操作失败: %v", err)

        if err.Error() == "特定错误信息" {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(models.NewErrorResponse("用户友好的错误信息", "EXAMPLE_ERROR"))
            return
        }

        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(models.NewErrorResponse("操作失败", "EXAMPLE_INTERNAL_ERROR"))
        return
    }

    // 返回成功响应
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(models.NewSuccessResponse(
        map[string]interface{}{
            "result": result,
        },
        "操作成功",
        "EXAMPLE_SUCCESS",
    ))
}
```

按照此规范编写的 Handler 将具有一致的结构、良好的错误处理、适当的日志记录和安全措施，使代码更加健壮和可维护。
