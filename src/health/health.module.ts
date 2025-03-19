import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { User } from '../common/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // 确保环境变量可用
    TypeOrmModule.forFeature([User]), // 用于数据库健康检查
  ],
  controllers: [HealthController],
  providers: [HealthService, RedisService],
})
export class HealthModule {}
