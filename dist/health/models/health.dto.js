"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthErrorResponseDto = exports.HealthCheckResponseDto = void 0;
// 健康检查响应数据
class HealthCheckResponseDto {
    overall;
    database;
    cache;
}
exports.HealthCheckResponseDto = HealthCheckResponseDto;
// 错误响应数据
class HealthErrorResponseDto {
    component;
    reason;
}
exports.HealthErrorResponseDto = HealthErrorResponseDto;
//# sourceMappingURL=health.dto.js.map