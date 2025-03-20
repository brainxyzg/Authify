import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { ContentTypeMiddleware } from './middleware/content-type.middleware';
import { LoggingInterceptor } from './middleware/logging.interceptor';
import { ErrorHandlingInterceptor } from './middleware/error-handling.interceptor';
import { JwtGuard } from './middleware/jwt.guard';
import { AuthenticationGuard } from './middleware/authentication.guard';
import { CsrfGuard } from './middleware/csrf.guard';
import { User } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([User, PasswordReset, BlacklistedToken]),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('throttler.ttl', 60000),
          limit: configService.get<number>('throttler.limit', 10),
        },
        {
          name: 'strict',
          ttl: 1000,
          limit: 5,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    JwtGuard,
    AuthenticationGuard,
    CsrfGuard,
  ],
  exports: [JwtGuard, AuthenticationGuard, CsrfGuard],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, SecurityHeadersMiddleware, CorsMiddleware, ContentTypeMiddleware)
      .forRoutes('/api/v1/*path');
  }
}
