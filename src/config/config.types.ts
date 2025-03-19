import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface CacheConfig {
  store: 'redis';
  host: string;
  port: number;
  password?: string;
  ttl: number;
  max: number;
  db?: number;
}

// 使用自定义接口，不扩展 TypeOrmModuleOptions
export interface DatabaseConfigCustom {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

// 使用交叉类型
export type DatabaseConfig = DatabaseConfigCustom & TypeOrmModuleOptions;

export interface JwtConfig {
  secret: string;
  accessTokenExpiration: string; // 替换 expiresIn
  refreshTokenExpiration: string;
  algorithm?: 'HS256' | 'HS384' | 'HS512'; // 可选，JWT 签名算法
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}
