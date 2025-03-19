import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { JwtModule } from '@nestjs/jwt';
import { RedisService } from '../common/services/redis.service';
import { ConfigModule } from '@nestjs/config';
import { JwtGuard } from '../common/middleware/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([User, LoginMethod]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [SsoController],
  providers: [SsoService, RedisService, JwtGuard],
})
export class SsoModule {}
