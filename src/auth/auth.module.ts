import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { TwoFactorModule } from '../two-factor/twofactor.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken]), TwoFactorModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
