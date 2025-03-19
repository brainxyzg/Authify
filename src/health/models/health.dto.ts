import { ApiResponse } from '../../common/models/api-response.dto';

// 健康检查响应数据
export class HealthCheckResponseDto {
  overall: 'healthy' | 'unhealthy';
  database: 'ok' | 'error';
  cache: 'ok' | 'error';
}

// 错误响应数据
export class HealthErrorResponseDto {
  component: 'database' | 'cache';
  reason: string;
}

// API 响应类型
export type HealthCheckApiResponse = ApiResponse<HealthCheckResponseDto | HealthErrorResponseDto | null>;