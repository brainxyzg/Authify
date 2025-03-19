import { registerAs } from '@nestjs/config';

// 辅助函数：将环境变量转换为数字并提供默认值
const toNumber = (value: string | undefined, defaultValue: number): number => {
  return value !== undefined && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
};

// 辅助函数：确保字符串非 undefined
const toString = (value: string | undefined, defaultValue: string): string => {
  return value !== undefined ? value : defaultValue;
};

export default registerAs('app', () => ({
  port: toNumber(process.env.PORT, 3000),
  env: toString(process.env.NODE_ENV, 'development'),
  logLevel: toString(process.env.LOG_LEVEL, 'info'),
}));
