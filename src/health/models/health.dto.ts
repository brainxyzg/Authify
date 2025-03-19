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

export type HealthCheckApiResponse =
  | { status: 'success'; data: HealthCheckResponseDto; message: string; code: string }
  | { status: 'error'; data: HealthErrorResponseDto; message: string; code: string };
