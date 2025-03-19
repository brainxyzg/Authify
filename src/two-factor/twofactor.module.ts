import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { User } from '../common/entities/user.entity';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import { JwtGuard } from '../common/middleware/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TwoFactorSetting, TwoFactorBackupCode]),
    ConfigModule,
    // 添加 JwtModule，以便 JwtService 可以被注入
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') 
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TwoFactorController],
  providers: [
    TwoFactorService,
    JwtGuard, // 确保 JwtGuard 在 providers 中
  ],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}