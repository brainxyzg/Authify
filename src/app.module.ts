// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './common/config/database.config';
import jwtConfig from './common/config/jwt.config';
import cacheConfig from './common/config/cache.config';
import * as redisStore from 'cache-manager-redis-store';
import { PublicModule } from './public/public.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TwoFactorModule } from './two-factor/twofactor.module';
import { SsoModule } from './sso/sso.module';
import { HealthModule } from './health/health.module';
import { JwtGuard } from './common/middleware/jwt.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cacheConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        console.log('Database Config:', dbConfig); // 调试输出
        return {
          ...dbConfig,
          autoLoadEntities: true,
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const cache = configService.get('cache');
        return {
          store: redisStore,
          host: cache.host,
          port: cache.port,
          password: cache.password || undefined,
          ttl: cache.ttl,
          max: cache.max,
        };
      },
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1h' },
    }),
    CommonModule,
    PublicModule,
    AuthModule,
    UsersModule,
    TwoFactorModule,
    SsoModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtGuard],
})
export class AppModule {}