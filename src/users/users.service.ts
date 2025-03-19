import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
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
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly VERIFICATION_CODE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24小时

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    private readonly mailerService: MailerService,
  ) {}

  async getCurrentUser(userId: number): Promise<ApiResponse<UserInfoResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'twoFactorSetting'],
    });
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');

    return {
      status: 'success',
      data: {
        user_id: user.id.toString(),
        username: user.username,
        email: user.email,
        roles: user.userRoles?.map(role => role.role.name) ?? [],
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
  ): Promise<ApiResponse<UpdateUserInfoResponseDto>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');

    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateDto.username },
      });
      if (existingUser && existingUser.id !== userId) {
        return {
          status: 'error',
          data: { username: user.username },
          message: 'Username already taken',
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
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');

    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.old_password,
      user.passwordHash,
    );
    if (!isOldPasswordValid) {
      return this.errorResponse('Incorrect old password', 'INCORRECT_PASSWORD');
    }

    user.passwordHash = await bcrypt.hash(changePasswordDto.new_password, 10);
    await this.userRepository.save(user);

    return this.successResponse('Password updated successfully', 'SUCCESS_UPDATE_PASSWORD');
  }

  async sendVerifyEmail(userId: number): Promise<ApiResponse<null>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');
    if (user.emailVerified) {
      return this.errorResponse('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    const code = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY_MS);

    const verification = this.emailVerificationRepository.create({
      user,
      token: code,
      expiresAt,
    });
    await this.emailVerificationRepository.save(verification);

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Verify Your Email',
      template: 'verify-email',
      context: { username: user.username, code },
    });
    this.logger.log(`Verification email sent to ${user.email}`);
    this.logger.log(`Verification code for ${user.email}: ${code}`);

    return this.successResponse('Verification email sent', 'SUCCESS_SEND_VERIFY_EMAIL');
  }

  async verifyEmail(
    userId: number,
    verifyDto: VerifyEmailDto,
  ): Promise<ApiResponse<VerifyEmailResponseDto>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return this.errorResponse('User not found', 'USER_NOT_FOUND');

    const verification = await this.emailVerificationRepository.findOne({
      where: { user: { id: userId }, token: verifyDto.code },
    });
    if (!verification || verification.expiresAt < new Date()) {
      return {
        status: 'error',
        data: { is_email_verified: false },
        message: 'Invalid or expired verification code',
        code: 'INVALID_CODE',
      };
    }

    user.emailVerified = true;
    await Promise.all([
      this.userRepository.save(user),
      this.emailVerificationRepository.delete({ id: verification.id }),
    ]);

    return {
      status: 'success',
      data: { is_email_verified: true },
      message: 'Email verified successfully',
      code: 'SUCCESS_VERIFY_EMAIL',
    };
  }

  private successResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'success', data: null, message, code };
  }

  private errorResponse(message: string, code: string): ApiResponse<any> {
    return { status: 'error', data: null, message, code };
  }
}
