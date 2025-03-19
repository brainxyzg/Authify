import { Injectable  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity'; 
import { HealthCheckApiResponse, HealthCheckResponseDto, HealthErrorResponseDto } from './models/health.dto';
import { RedisService } from '../common/services/redis.service'; 
import { Logger } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private redisService: RedisService,
  ) {}

  async checkHealth(): Promise<HealthCheckApiResponse> {
    const health: HealthCheckResponseDto = {
      overall: 'healthy',
      database: 'ok',
      cache: 'ok',
    };

    // 检查数据库连接
    try {
      await this.userRepository.query('SELECT 1');
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      health.database = 'error';
      health.overall = 'unhealthy';
      return {
        status: 'error',
        data: { component: 'database', reason: 'Connection failed' } as HealthErrorResponseDto,
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      };
    }

    // 检查 Redis 连接
    try {
      const redisHealth = await this.redisService.health();
      if (redisHealth.status !== 'ok') {
        throw new Error(redisHealth.message || 'Redis health check failed');
      }
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      health.cache = 'error';
      health.overall = 'unhealthy';
      return {
        status: 'error',
        data: { component: 'cache', reason: 'Connection failed' } as HealthErrorResponseDto,
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      };
    }

    return {
      status: 'success',
      data: health,
      message: 'Service is operational',
      code: 'SUCCESS_HEALTH_CHECK',
    };
  }
}