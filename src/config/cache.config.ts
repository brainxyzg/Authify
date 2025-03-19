import { registerAs } from '@nestjs/config';
import { CacheConfig } from './config.types';
import { parseNumber, parseString } from '../common/utils/config-utils';

// 配置命名空间
export default registerAs(
  'cache',
  () =>
    ({
      store: 'redis' as const, // 显式类型断言
      host: parseString(process.env.REDIS_HOST, 'localhost'),
      port: parseNumber(process.env.REDIS_PORT, 6379, 1, 65535), // 端口范围限制
      password: parseString(process.env.REDIS_PASSWORD, ''), // 空密码表示无密码
      ttl: parseNumber(process.env.CACHE_TTL, 3600, 0), // TTL >= 0
      max: parseNumber(process.env.CACHE_MAX, 100, 1), // 最大项数 >= 1
      db: parseNumber(process.env.REDIS_DB, 0, 0, 15),
    }) as CacheConfig,
);
