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
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
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
    try {
      const redisHealth = await this.redisService.health();
      if (redisHealth.status !== 'ok') {
        throw new Error(redisHealth.message || 'Redis health check failed');
      }
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
