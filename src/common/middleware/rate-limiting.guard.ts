import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Reflector } from '@nestjs/core';
import { THROTTLE_METADATA_KEY } from '../decorators/throttle.decorator';

// 自定义响应接口
interface ErrorResponse {
  status: string;
  data: null;
  message: string;
  code: string;
}

@Injectable()
export class RateLimitingGuard extends ThrottlerGuard implements CanActivate {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    protected readonly throttlerStorage: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super({
      throttlers: [
        {
          ttl: 60000, // 默认 60 秒窗口
          limit: 10, // 默认 10 次请求
        }
      ]
    }, throttlerStorage, reflector);
  }

  // 创建统一的错误响应
  private createRateLimitError(): { response: ErrorResponse, status: number } {
    return {
      response: {
        status: 'error',
        data: null,
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      status: HttpStatus.TOO_MANY_REQUESTS
    };
  }

  private getRateLimitConfig(context: ExecutionContext): { ttl: number; limit: number } {
    // 从方法或类级别读取 Throttle 装饰器的元数据
    const throttleConfig =
      this.reflector.get<{ ttl: number; limit: number }>(THROTTLE_METADATA_KEY, context.getHandler()) ||
      this.reflector.get<{ ttl: number; limit: number }>(THROTTLE_METADATA_KEY, context.getClass());

    // 如果未设置装饰器，使用默认值
    return {
      ttl: throttleConfig?.ttl ?? 60000,
      limit: throttleConfig?.limit ?? 10,
    };
  }

  // 获取请求标识符
  private getRequestIdentifier(request: any): { key: string, isUser: boolean } {
    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const userId = request.user?.user_id;
    
    const key = userId ? `rate:user:${userId}` : `rate:ip:${ip}`;
    return { key, isUser: !!userId };
  }

  private async checkAndUpdateRateLimit(key: string, limit: number, ttl: number): Promise<boolean> {
    try {
      const multi = this.redis.multi();
      multi.get(key);
      multi.incr(key);
      const results = await multi.exec();
  
      // 检查 results 是否为 null
      if (!results) {
        console.error('Redis multi.exec returned null, possibly a transaction failure');
        return true; // 放行请求，避免因 Redis 失败而阻塞
      }
  
      // results 已确保非 null，安全访问
      const current = results[0][1] ? parseInt(results[0][1] as string, 10) : 0;
  
      if (current === 0) {
        await this.redis.expire(key, ttl);
      }
  
      return current < limit;
    } catch (error) {
      console.error('Redis rate limiting error:', error);
      return true; // 放行请求
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 调用父类的速率限制逻辑
      const throttlerResult = await super.canActivate(context);
      if (!throttlerResult) {
        const error = this.createRateLimitError();
        throw new HttpException(error.response, error.status);
      }

      // 获取请求对象
      const request = context.switchToHttp().getRequest();
      
      // 判断是否跳过限流检查
      const skipCheck = this.reflector.get<boolean>('skip-throttle', context.getHandler());
      if (skipCheck) {
        return true;
      }

      // 获取限流配置
      const { ttl, limit } = this.getRateLimitConfig(context);
      
      // 获取请求标识符
      const { key, isUser } = this.getRequestIdentifier(request);
      
      // 检查并更新 Redis 中的计数器
      const withinLimit = await this.checkAndUpdateRateLimit(key, limit, ttl);
      
      if (!withinLimit) {
        const error = this.createRateLimitError();
        throw new HttpException(error.response, error.status);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // 处理意外错误
      console.error('Rate limiting unexpected error:', error);
      return true; // 允许请求通过，避免因限流功能故障而阻塞服务
    }
  }
}