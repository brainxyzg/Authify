import { registerAs } from '@nestjs/config';

// 辅助函数：将环境变量转换为数字并提供默认值
const toNumber = (value: string | undefined, defaultValue: number): number => {
  return value !== undefined && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
};

// 辅助函数：确保字符串非 undefined
const toString = (value: string | undefined, defaultValue: string): string => {
  return value !== undefined ? value : defaultValue;
};

// 辅助函数：将环境变量转换为布尔值
const toBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  return value !== undefined ? value === 'true' : defaultValue;
};

export default registerAs('database', () => ({
  type: 'postgres' as const, // 确保类型为 'postgres'
  host: toString(process.env.DB_HOST, 'localhost'),
  port: toNumber(process.env.DB_PORT, 5432),
  username: toString(process.env.DB_USERNAME, 'postgres'),
  password: toString(process.env.DB_PASSWORD, 'postgres'),
  database: toString(process.env.DB_NAME, 'authify_db'),
  entities: ['dist/**/*.entity{.ts,.js}'], // 编译后的实体路径
  synchronize: toBoolean(process.env.DB_SYNCHRONIZE, process.env.NODE_ENV !== 'production'),
  logging: toBoolean(process.env.DB_LOGGING, process.env.NODE_ENV !== 'production'),
}));