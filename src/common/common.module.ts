// src/common/common.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { ContentTypeMiddleware } from './middleware/content-type.middleware';
import { LoggingInterceptor } from './middleware/logging.interceptor';
import { ErrorHandlingInterceptor } from './middleware/error-handling.interceptor';
import { JwtGuard } from './middleware/jwt.guard';
import { AuthenticationGuard } from './middleware/authentication.guard';
import { RateLimitingGuard } from './middleware/rate-limiting.guard';
import { CsrfGuard } from './middleware/csrf.guard';
import { User } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';

@Module({
  imports: [
    ConfigModule, // 确保 ConfigService 可用
    TypeOrmModule.forFeature([User, PasswordReset, BlacklistedToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single' as const,
        options: {
          host: configService.get('cache.host', 'localhost'),
          port: configService.get<number>('cache.port', 6379),
          password: configService.get('cache.password') || undefined,
          db: configService.get<number>('cache.db', 0),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('RATE_LIMIT_TTL', 60000), // 毫秒
            limit: configService.get<number>('RATE_LIMIT_MAX', 10),
          },
        ],
      }),
    }),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ErrorHandlingInterceptor },
    { provide: APP_GUARD, useClass: RateLimitingGuard },
    JwtGuard,
    AuthenticationGuard,
    RateLimitingGuard,
    CsrfGuard,
  ],
  exports: [
    TypeOrmModule,
    JwtGuard,
    AuthenticationGuard,
    RateLimitingGuard,
    CsrfGuard,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, SecurityHeadersMiddleware, CorsMiddleware, ContentTypeMiddleware)
      .forRoutes('*');
  }
}