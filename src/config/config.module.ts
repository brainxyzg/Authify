import { Module, Logger } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './app.config';
import cacheConfig from './cache.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mailConfig from './mail.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, cacheConfig, databaseConfig, jwtConfig, mailConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: Joi.object({
        // App 配置
        PORT: Joi.number().min(1).max(65535).default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

        // Cache 配置
        REDIS_HOST: Joi.string().hostname().default('localhost'),
        REDIS_PORT: Joi.number().min(1).max(65535).default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        CACHE_DEFAULT_TTL: Joi.number().min(0).default(3600),

        // Database 配置
        DB_HOST: Joi.string().hostname().default('localhost'),
        DB_PORT: Joi.number().min(1).max(65535).default(5432),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().optional(), // 根据需求调整
        DB_NAME: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.boolean().default(true),

        // JWT 配置
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1h'),
        JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
        JWT_ALGORITHM: Joi.string().valid('HS256', 'HS384', 'HS512').default('HS256'),

        // Mail 配置
        MAIL_HOST: Joi.string()
          .hostname()
          .when('NODE_ENV', {
            is: 'production',
            then: Joi.required(),
            otherwise: Joi.optional().default('localhost'),
          }),
        MAIL_PORT: Joi.number().min(1).max(65535).default(587),
        MAIL_USER: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional().default('test@example.com'),
        }),
        MAIL_PASSWORD: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional().default('password'),
        }),
        MAIL_FROM: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional().default('Authify <no-reply@example.com>'),
        }),

        // 中间件配置
        CORS_ALLOWED_ORIGINS: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required().default('https://yourdomain.com'),
          otherwise: Joi.string().default('*'),
        }),
        RATE_LIMIT_TTL: Joi.number().default(60),
        RATE_LIMIT_MAX: Joi.number().default(10),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
        callback: err => {
          if (err) {
            Logger.error(`Config validation failed: ${err.message}`, 'ConfigModule');
            process.exit(1); // 验证失败时终止
          }
        },
      },
    }),
  ],
})
export class ConfigModule {}
