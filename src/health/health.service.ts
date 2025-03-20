import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { User } from '../common/entities/user.entity';
import {
  HealthCheckApiResponse,
  HealthCheckResponseDto,
  HealthErrorResponseDto,
} from './models/health.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // 替换为 CacheManager
  ) {}

  async checkHealth(): Promise<HealthCheckApiResponse> {
    const health: HealthCheckResponseDto = {
      overall: 'healthy',
      database: 'ok',
      cache: 'ok',
    };

    // 检查数据库连接
    const dbResult = await this.checkDatabase();
    if (!dbResult.isHealthy) {
      health.database = 'error';
      health.overall = 'unhealthy';
      return this.errorResponse('database', dbResult.errorMessage);
    }

    // 检查 Redis 连接
    const redisResult = await this.checkRedis();
    if (!redisResult.isHealthy) {
      health.cache = 'error';
      health.overall = 'unhealthy';
      return this.errorResponse('cache', redisResult.errorMessage);
    }

    return {
      status: 'success',
      data: health,
      message: 'Service is operational',
      code: 'SUCCESS_HEALTH_CHECK',
    };
  }

  private async checkDatabase(): Promise<{ isHealthy: boolean; errorMessage?: string }> {
    try {
      await this.userRepository.query('SELECT 1');
      return { isHealthy: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error(`Database health check failed: ${message}`);
      return { isHealthy: false, errorMessage: message };
    }
  }

  private async checkRedis(): Promise<{ isHealthy: boolean; errorMessage?: string }> {
    const testKey = 'health:check';
    const testValue = 'ok';
    try {
      // 执行简单的 set 和 get 操作来测试 Redis 连接
      await this.cacheManager.set(testKey, testValue, 10); // 设置 TTL 为 10 秒
      const result = await this.cacheManager.get(testKey);
      if (result !== testValue) {
        throw new Error('Redis returned an unexpected value');
      }
      await this.cacheManager.del(testKey); // 清理测试键
      return { isHealthy: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.error(`Redis health check failed: ${message}`);
      return { isHealthy: false, errorMessage: message };
    }
  }

  private errorResponse(component: string, reason: string): HealthCheckApiResponse {
    return {
      status: 'error',
      data: { component, reason } as HealthErrorResponseDto,
      message: 'Service unavailable',
      code: 'SERVICE_UNAVAILABLE',
    };
  }
}
