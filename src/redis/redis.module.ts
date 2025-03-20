import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule as IORedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service';
import { CacheConfig } from '../config/config.types';

@Global()
@Module({
  imports: [
    IORedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisModuleOptions => {
        const cacheConfig = configService.get<CacheConfig>('cache');
        if (!cacheConfig?.host || !cacheConfig?.port) {
          throw new Error('Redis configuration missing host or port');
        }
        return {
          type: 'single', // Explicitly specify single instance
          options: {
            host: cacheConfig.host,
            port: cacheConfig.port,
            password: cacheConfig.password || undefined,
            db: cacheConfig.db || 0,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
          },
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
