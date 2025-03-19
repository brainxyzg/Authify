import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../common/entities/user.entity';
import { PasswordReset } from '../common/entities/password-reset.entity';
import { RegisterDto, RegisterResponseDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);
  private readonly RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1小时

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly mailerService: MailerService,
  ) {}

  async register(registerDto: RegisterDto): Promise<ApiResponse<RegisterResponseDto>> {
    const { username, email, password } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser) {
      const message =
        existingUser.username === username ? 'Username already exists' : 'Email already exists';
      return this.errorResponse(message, 'USER_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ username, email, passwordHash: hashedPassword });
    const savedUser = await this.userRepository.save(user);

    return {
      status: 'success',
      data: { id: savedUser.id, username: savedUser.username, email: savedUser.email },
      message: 'User registered successfully',
      code: 'SUCCESS_REGISTER',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<null>> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // 为了安全，不泄露用户是否存在
      this.logger.debug(`Password reset requested for non-existent email: ${email}`);
      return this.successResponse('Password reset email sent', 'SUCCESS_FORGOT_PASSWORD');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRY_MS);
    const reset = this.passwordResetRepository.create({ userId: user.id, token, expiresAt });
    await this.passwordResetRepository.save(reset);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: { username: user.username, token },
    });
    this.logger.log(`Reset email sent to ${email}`);
    this.logger.log(`Reset token generated for ${email}: ${token}`);

    return this.successResponse('Password reset email sent', 'SUCCESS_FORGOT_PASSWORD');
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<null>> {
    const { token, newPassword } = resetPasswordDto;

    const reset = await this.passwordResetRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!reset || reset.expiresAt < new Date()) {
      return this.errorResponse('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(reset.userId, { passwordHash: hashedPassword });
    await this.passwordResetRepository.delete({ id: reset.id });

    return this.successResponse('Password reset successfully', 'SUCCESS_RESET_PASSWORD');
  }

  // 辅助方法
  private successResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'success', data: null, message, code };
  }

  private errorResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'error', data: null, message, code };
  }
}
