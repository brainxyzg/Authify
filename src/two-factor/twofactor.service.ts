import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { User } from '../common/entities/user.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { Verify2FAResponseDto, Enable2FAResponseDto, GenerateBackupCodesResponseDto, Verify2FADto } from './models/twofactor.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TwoFactorSetting)
    private twoFactorRepository: Repository<TwoFactorSetting>,
    @InjectRepository(TwoFactorBackupCode)
    private backupCodeRepository: Repository<TwoFactorBackupCode>,
  ) {
    authenticator.options = { step: 30, window: 1 }; // 30 秒周期，允许前后 1 个周期误差
  }

  async enable2FA(userId: number): Promise<ApiResponse<Enable2FAResponseDto|null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (user.twoFactorSetting?.isEnabled) {
      return {
        status: 'error',
        data: null,
        message: '2FA already enabled',
        code: '2FA_ALREADY_ENABLED',
      };
    }

    const secret = authenticator.generateSecret(); // 生成 TOTP 密钥
    const otpauthUrl = authenticator.keyuri(user.username, 'Authify', secret); // 生成 otpauth URL
    const qrCodeUrl = await toDataURL(otpauthUrl); // 生成二维码

    // 修改这里：使用 generateBackupCodesInternal 而不是 generateBackupCodes
    const backupCodes = this.generateBackupCodesInternal(2);

    let twoFactorSetting = await this.twoFactorRepository.findOne({ 
      where: { user: { id: userId } } 
    });
    if (!twoFactorSetting) {
      twoFactorSetting = this.twoFactorRepository.create({
        user,
        secret,
        isEnabled: false,
      });
    } else {
      twoFactorSetting.secret = secret;
      twoFactorSetting.isEnabled = false;
      twoFactorSetting.enabledAt = undefined;
    }
    await this.twoFactorRepository.save(twoFactorSetting);
    await this.saveBackupCodes(user, backupCodes);

    return {
      status: 'success',
      data: { secret, qr_code_url: qrCodeUrl, backup_codes: backupCodes  },
      message: '2FA setup initiated, please verify the code',
      code: 'SUCCESS_2FA_INIT',
    };
  }

  async verify2FA(userId: number, verifyDto: Verify2FADto): Promise<ApiResponse<Verify2FAResponseDto | null>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user || !user.twoFactorSetting) {
      return {
        status: 'error',
        data: null,
        message: '2FA not initiated',
        code: '2FA_NOT_INITIATED',
      };
    }

    const isValid = authenticator.verify({ token: verifyDto.code, secret: user.twoFactorSetting.secret });
    if (!isValid) {
      return {
        status: 'error',
        data: { two_factor_enabled: false },
        message: 'Verification failed',
        code: 'INVALID_2FA_CODE',
      };
    }

    user.twoFactorSetting.isEnabled = true;
    await this.twoFactorRepository.save(user.twoFactorSetting);

    return {
      status: 'success',
      data: { two_factor_enabled: true },
      message: '2FA activated successfully',
      code: 'SUCCESS_VERIFY_2FA',
    };
  }

  async disable2FA(userId: number): Promise<ApiResponse<null>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
      return {
        status: 'error',
        data: null,
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      };
    }

    await this.twoFactorRepository.update({ userId: user.twoFactorSetting.userId }, { isEnabled: false });
    await this.backupCodeRepository.delete({ user: { id: userId } });

    return {
      status: 'success',
      data: null,
      message: '2FA disabled successfully',
      code: 'SUCCESS_DISABLE_2FA',
    };
  }

  async generateBackupCodes(userId: number): Promise<ApiResponse<GenerateBackupCodesResponseDto | null>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
      return {
        status: 'error',
        data: null,
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      };
    }

    // 修改这里：使用 generateBackupCodesInternal 而不是 generateBackupCodes1
    const backupCodes = this.generateBackupCodesInternal(2);
    await this.backupCodeRepository.delete({ user: { id: userId } });
    await this.saveBackupCodes(user, backupCodes);

    return {
      status: 'success',
      data: { backup_codes: backupCodes },
      message: 'Backup codes generated successfully',
      code: 'SUCCESS_GENERATE_BACKUP_CODES',
    };
  }

  // 重命名方法：generateBackupCodes1 -> generateBackupCodesInternal
  private generateBackupCodesInternal(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString().slice(2, 10)); // 8位随机数字
    }
    return codes;
  }

  private async saveBackupCodes(user: User, codes: string[]): Promise<void> {
    const hashedCodes = await Promise.all(codes.map(code => bcrypt.hash(code, 10)));
    const backupCodeEntities = hashedCodes.map(hash => this.backupCodeRepository.create({ user, codeHash: hash }));
    await this.backupCodeRepository.save(backupCodeEntities);
  }

  // 用于登录验证的公共方法
  async validate2FACode(userId: number, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting', 'twoFactorBackupCodes'],
    });
    if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
      return false;
    }

    const isTOTPValid = authenticator.verify({ token: code, secret: user.twoFactorSetting.secret });
    if (isTOTPValid) return true;

    const backupCode = user.twoFactorBackupCodes.find(async bc => await bcrypt.compare(code, bc.codeHash));
    if (backupCode) {
      await this.backupCodeRepository.delete({ id: backupCode.id });
      return true;
    }

    return false;
  }
}