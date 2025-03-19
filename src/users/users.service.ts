import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { EmailVerification } from '../common/entities/email-verification.entity';
import {
  UpdateUserInfoDto,
  ChangePasswordDto,
  VerifyEmailDto,
  UserInfoResponseDto,
  UpdateUserInfoResponseDto,
  VerifyEmailResponseDto,
} from './models/users.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
  ) {}

  async getCurrentUser(userId: number): Promise<ApiResponse<UserInfoResponseDto | null>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'twoFactorSetting'],
    });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    return {
      status: 'success',
      data: {
        user_id: user.id.toString(),
        username: user.username,
        email: user.email,
        roles: user.userRoles.map(role => role.role.name),
        is_email_verified: user.emailVerified,
        two_factor_enabled: !!user.twoFactorSetting?.isEnabled,
      },
      message: 'User info retrieved successfully',
      code: 'SUCCESS_GET_USER_INFO',
    };
  }

  async updateUserInfo(
    userId: number,
    updateDto: UpdateUserInfoDto,
  ): Promise<ApiResponse<UpdateUserInfoResponseDto | null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (updateDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateDto.username },
      });
      if (existingUser && existingUser.id !== userId) {
        return {
          status: 'error',
          data: { username: user.username },
          message: 'Update failed',
          code: 'USERNAME_TAKEN',
        };
      }
      user.username = updateDto.username;
    }

    await this.userRepository.save(user);
    return {
      status: 'success',
      data: { username: user.username },
      message: 'User info updated successfully',
      code: 'SUCCESS_UPDATE_USER_INFO',
    };
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse<null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.old_password,
      user.passwordHash,
    );
    if (!isOldPasswordValid) {
      return {
        status: 'error',
        data: null,
        message: 'Incorrect old password',
        code: 'INCORRECT_PASSWORD',
      };
    }

    const newPasswordHash = await bcrypt.hash(changePasswordDto.new_password, 10);
    user.passwordHash = newPasswordHash;
    await this.userRepository.save(user);

    return {
      status: 'success',
      data: null,
      message: 'Password updated successfully',
      code: 'SUCCESS_UPDATE_PASSWORD',
    };
  }

  async sendVerifyEmail(userId: number): Promise<ApiResponse<null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (user.emailVerified) {
      return {
        status: 'error',
        data: null,
        message: 'Email already verified',
        code: 'EMAIL_ALREADY_VERIFIED',
      };
    }

    // 修改这部分代码
    const code = randomBytes(3).toString('hex').toUpperCase(); // 6 字符验证码
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时有效期

    // 创建一个符合 EmailVerification 实体结构的对象
    const verification = new EmailVerification();
    verification.user = user;
    verification.token = code;
    verification.expiresAt = expiresAt;

    await this.emailVerificationRepository.save(verification);

    // TODO: 发送邮件逻辑（集成邮件服务）
    console.log(`Verification code for ${user.email}: ${code}`);

    return {
      status: 'success',
      data: null,
      message: 'Verification email sent',
      code: 'SUCCESS_SEND_VERIFY_EMAIL',
    };
  }

  async verifyEmail(
    userId: number,
    verifyDto: VerifyEmailDto,
  ): Promise<ApiResponse<VerifyEmailResponseDto | null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return {
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    const verification = await this.emailVerificationRepository.findOne({
      where: { user: { id: userId }, token: verifyDto.code },
    });
    if (!verification || verification.expiresAt < new Date()) {
      return {
        status: 'error',
        data: { is_email_verified: false },
        message: 'Verification failed',
        code: 'INVALID_CODE',
      };
    }

    user.emailVerified = true;
    await this.userRepository.save(user);
    await this.emailVerificationRepository.delete({ id: verification.id });

    return {
      status: 'success',
      data: { is_email_verified: true },
      message: 'Email verified successfully',
      code: 'SUCCESS_VERIFY_EMAIL',
    };
  }
}
