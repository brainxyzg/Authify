import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import cacheConfig from './cache.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mailConfig from './mail.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, cacheConfig, databaseConfig, jwtConfig, mailConfig], // 加载所有配置
      envFilePath: '.env',
    }),
  ],
})
export class ConfigModule {}
