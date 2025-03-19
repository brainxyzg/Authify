import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { CommonModule } from '../common/common.module';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, LoginMethod]), CommonModule],
  controllers: [SsoController],
  providers: [SsoService, RedisService],
  exports: [SsoService], // 可选：导出服务供其他模块使用
})
export class SsoModule {}
