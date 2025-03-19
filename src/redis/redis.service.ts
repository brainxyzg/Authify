import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectRedis() private readonly client: Redis) {}

  async onModuleInit() {
    try {
      await this.client.ping();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    console.log('Redis connection closed');
  }

  async health(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const response = await this.client.ping();
      return response === 'PONG'
        ? { status: 'ok' }
        : { status: 'error', message: 'Unexpected PING response' };
    } catch (error) {
      return { status: 'error', message: `Redis ping failed: ${error.message}` };
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    ttl ? await this.client.setex(key, ttl, value) : await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async increment(key: string, ttl?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (ttl && count === 1) await this.client.expire(key, ttl);
    return count;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async flushAll(): Promise<void> {
    await this.client.flushall();
  }
}
