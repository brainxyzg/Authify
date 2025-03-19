import { registerAs } from '@nestjs/config';

// 辅助函数：将环境变量转换为数字并提供默认值
const toNumber = (value: string | undefined, defaultValue: number): number => {
  return value !== undefined && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
};

// 辅助函数：确保字符串非 undefined
const toString = (value: string | undefined, defaultValue: string): string => {
  return value !== undefined ? value : defaultValue;
};

export default registerAs('cache', () => ({
  store: 'redis',
  host: toString(process.env.REDIS_HOST, 'localhost'),
  port: toNumber(process.env.REDIS_PORT, 6379),
  password: toString(process.env.REDIS_PASSWORD, ''),
  ttl: toNumber(process.env.CACHE_TTL, 3600), // 默认缓存时间 1 小时
  max: toNumber(process.env.CACHE_MAX, 100), // 最大缓存项数
}));
