import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { User } from '../common/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // 用于数据库健康检查
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
