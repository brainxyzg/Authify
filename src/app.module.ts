import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import redisStore from 'cache-manager-ioredis'; // Updated import
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PublicModule } from './public/public.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TwoFactorModule } from './two-factor/twofactor.module';
import { SsoModule } from './sso/sso.module';
import { HealthModule } from './health/health.module';
import { JwtConfig } from './config/config.types';
import { MailModule } from './mail/mail.module';
import { User } from './common/entities/user.entity';
import { UserRole } from './common/entities/user-role.entity';
import { Role } from './common/entities/role.entity';
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        if (!dbConfig) throw new Error('Database configuration is missing');
        Logger.debug(`Database Config: ${JSON.stringify(dbConfig)}`, 'AppModule');
        const isProduction = process.env.NODE_ENV === 'production';
        return {
          ...dbConfig,
          entities: [User, UserRole, Role],
          autoLoadEntities: true,
          logging: !isProduction,
          synchronize: !isProduction,
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const cache = configService.get('cache');
        if (!cache?.host || !cache?.port) {
          throw new Error('Redis configuration is missing host or port');
        }
        return {
          store: redisStore, // Pass the store function directly
          host: cache.host,
          port: cache.port,
          password: cache.password || undefined,
          ttl: cache.ttl,
          max: cache.max,
        };
      },
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const jwt = configService.get<JwtConfig>('jwt');
        if (!jwt?.secret) throw new Error('JWT secret is missing');
        return {
          secret: jwt.secret,
          signOptions: { expiresIn: jwt.accessTokenExpiration },
        };
      },
    }),
    MailModule,
    CommonModule,
    PublicModule,
    AuthModule,
    UsersModule,
    TwoFactorModule,
    SsoModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
