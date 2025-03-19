import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { User } from '../common/entities/user.entity';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, TwoFactorSetting, TwoFactorBackupCode]), CommonModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
