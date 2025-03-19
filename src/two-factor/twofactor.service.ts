import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { User } from '../common/entities/user.entity';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import {
  Verify2FAResponseDto,
  Enable2FAResponseDto,
  GenerateBackupCodesResponseDto,
  Verify2FADto,
} from './models/twofactor.dto';
import { ApiResponse } from '../common/models/api-response.dto';

@Injectable()
export class TwoFactorService {
  private readonly BACKUP_CODE_COUNT = 2;
  private readonly BACKUP_CODE_LENGTH = 8;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TwoFactorSetting)
    private readonly twoFactorRepository: Repository<TwoFactorSetting>,
    @InjectRepository(TwoFactorBackupCode)
    private readonly backupCodeRepository: Repository<TwoFactorBackupCode>,
  ) {
    authenticator.options = { step: 30, window: 1 }; // 30秒周期，前后1个周期容差
  }

  async enable2FA(userId: number): Promise<ApiResponse<Enable2FAResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');
    if (user.twoFactorSetting?.isEnabled) {
      return this.errorResponse('2FA already enabled', '2FA_ALREADY_ENABLED');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.username, 'Authify', secret);
    const qrCodeUrl = await toDataURL(otpauthUrl);
    const backupCodes = this.generateBackupCodesInternal(this.BACKUP_CODE_COUNT);

    const twoFactorSetting =
      user.twoFactorSetting ?? this.twoFactorRepository.create({ user, secret, isEnabled: false });
    twoFactorSetting.secret = secret;
    twoFactorSetting.isEnabled = false;
    twoFactorSetting.enabledAt = null;
    await this.twoFactorRepository.save(twoFactorSetting);
    await this.saveBackupCodes(user, backupCodes);

    return {
      status: 'success',
      data: { secret, qr_code_url: qrCodeUrl, backup_codes: backupCodes },
      message: '2FA setup initiated, please verify the code',
      code: 'SUCCESS_2FA_INIT',
    };
  }

  async verify2FA(
    userId: number,
    verifyDto: Verify2FADto,
  ): Promise<ApiResponse<Verify2FAResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user || !user.twoFactorSetting) {
      return this.errorResponse('2FA not initiated', '2FA_NOT_INITIATED');
    }

    const isValid = authenticator.verify({
      token: verifyDto.code,
      secret: user.twoFactorSetting.secret,
    });
    if (!isValid) {
      return {
        status: 'error',
        data: { two_factor_enabled: false },
        message: 'Verification failed',
        code: 'INVALID_2FA_CODE',
      };
    }

    user.twoFactorSetting.isEnabled = true;
    user.twoFactorSetting.enabledAt = new Date();
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
    if (!user || !user.twoFactorSetting?.isEnabled) {
      return this.errorResponse('2FA not enabled', '2FA_NOT_ENABLED');
    }

    await Promise.all([
      this.twoFactorRepository.update({ userId }, { isEnabled: false, enabledAt: null }),
      this.backupCodeRepository.delete({ user: { id: userId } }),
    ]);

    return this.successResponse('2FA disabled successfully', 'SUCCESS_DISABLE_2FA');
  }

  async generateBackupCodes(userId: number): Promise<ApiResponse<GenerateBackupCodesResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting'],
    });
    if (!user || !user.twoFactorSetting?.isEnabled) {
      return this.errorResponse('2FA not enabled', '2FA_NOT_ENABLED');
    }

    const backupCodes = this.generateBackupCodesInternal(this.BACKUP_CODE_COUNT);
    await this.backupCodeRepository.delete({ user: { id: userId } });
    await this.saveBackupCodes(user, backupCodes);

    return {
      status: 'success',
      data: { backup_codes: backupCodes },
      message: 'Backup codes generated successfully',
      code: 'SUCCESS_GENERATE_BACKUP_CODES',
    };
  }

  async validate2FACode(userId: number, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactorSetting', 'twoFactorBackupCodes'],
    });
    if (!user || !user.twoFactorSetting?.isEnabled) return false;

    const isTOTPValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSetting.secret,
    });
    if (isTOTPValid) return true;

    const backupCode = await this.findValidBackupCode(user, code);
    if (backupCode) {
      await this.backupCodeRepository.delete({ id: backupCode.id });
      return true;
    }

    return false;
  }

  private generateBackupCodesInternal(count: number): string[] {
    return Array.from({ length: count }, () =>
      Math.random()
        .toString(36)
        .slice(2, 2 + this.BACKUP_CODE_LENGTH)
        .toUpperCase(),
    );
  }

  private async saveBackupCodes(user: User, codes: string[]): Promise<void> {
    const hashedCodes = await Promise.all(codes.map(code => bcrypt.hash(code, 10)));
    const entities = hashedCodes.map(hash =>
      this.backupCodeRepository.create({ user, codeHash: hash }),
    );
    await this.backupCodeRepository.save(entities);
  }

  private async findValidBackupCode(
    user: User,
    code: string,
  ): Promise<TwoFactorBackupCode | undefined> {
    for (const bc of user.twoFactorBackupCodes ?? []) {
      if (await bcrypt.compare(code, bc.codeHash)) return bc;
    }
    return undefined;
  }

  private successResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'success', data: null, message, code };
  }

  private errorResponse(message: string, code: string): ApiResponse<any> {
    return { status: 'error', data: null, message, code };
  }
}
