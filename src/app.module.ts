import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import redisStore from 'cache-manager-ioredis';

// Modules
import { PublicModule } from './public/public.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TwoFactorModule } from './two-factor/twofactor.module';
import { SsoModule } from './sso/sso.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';

// Entities
import { User } from './common/entities/user.entity';
import { UserRole } from './common/entities/user-role.entity';
import { Role } from './common/entities/role.entity';

// Types
import { JwtConfig } from './config/config.types';

// Constants
const CORE_ENTITIES = [User, UserRole, Role];

// Factory functions
const createTypeOrmOptions = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const dbConfig = configService.get<TypeOrmModuleOptions>('database');
  if (!dbConfig) throw new Error('Database configuration is missing in your config file');

  const isProduction = process.env.NODE_ENV === 'production';
  return {
    ...dbConfig,
    entities: CORE_ENTITIES,
    autoLoadEntities: true,
    logging: !isProduction,
    synchronize: !isProduction,
  };
};

const createCacheOptions = async (configService: ConfigService) => {
  const cache = configService.get('cache');
  if (!cache) throw new Error('Cache configuration is missing in your config file');
  if (!cache.host || !cache.port) {
    throw new Error('Redis configuration must include host and port');
  }

  return {
    store: redisStore,
    host: cache.host,
    port: cache.port,
    password: cache.password || undefined,
    ttl: cache.ttl,
    max: cache.max,
  };
};

const createJwtOptions = async (configService: ConfigService): Promise<JwtModuleOptions> => {
  const jwt = configService.get<JwtConfig>('jwt');
  if (!jwt) throw new Error('JWT configuration is missing in your config file');
  if (!jwt.secret) throw new Error('JWT secret is required');

  return {
    secret: jwt.secret,
    signOptions: { expiresIn: jwt.accessTokenExpiration },
  };
};

@Module({
  imports: [
    // Config modules
    ConfigModule,

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),

    // Cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: createCacheOptions,
    }),

    // JWT
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),

    // Application modules
    MailModule,
    CommonModule,
    PublicModule,
    AuthModule,
    UsersModule,
    TwoFactorModule,
    SsoModule,
    HealthModule,
  ],
})
export class AppModule {}
