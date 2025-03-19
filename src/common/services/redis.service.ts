import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  client: RedisClient;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'), // 可选
      db: this.configService.get<number>('REDIS_DB', 0), // 默认数据库
    });
  }

  // 在模块初始化时连接 Redis
  async onModuleInit() {
    try {
      await this.client.ping();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  async health(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const response = await this.client.ping();
      if (response === 'PONG') {
        return { status: 'ok' };
      } else {
        return { status: 'error', message: 'Unexpected PING response' };
      }
    } catch (error) {
      return { status: 'error', message: `Redis ping failed: ${error.message}` };
    }
  }

  // 在模块销毁时断开连接
  async onModuleDestroy() {
    await this.client.quit();
    console.log('Redis connection closed');
  }

  // 设置键值对（带过期时间）
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // 获取键值
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // 删除键
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // 检查键是否存在
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // 增加计数器（用于速率限制）
  async increment(key: string, ttl?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (ttl && count === 1) {
      await this.client.expire(key, ttl); // 首次设置 TTL
    }
    return count;
  }

  // 获取剩余 TTL
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // 清空数据库（谨慎使用，仅用于测试）
  async flushAll(): Promise<void> {
    await this.client.flushall();
  }
}
