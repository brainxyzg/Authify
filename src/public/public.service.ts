import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { RegisterDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import * as bcrypt from 'bcrypt';
import { PasswordReset } from '../common/entities/password-reset.entity';
import { randomBytes } from 'crypto';
import { RegisterResponseDto } from './models/register.dto';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
  ) {}

  async register(registerDto: RegisterDto): Promise<ApiResponse<RegisterResponseDto | null>> {
    const { username, email, password } = registerDto;

    // 检查用户名或邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser) {
      return {
        status: 'error',
        data: null,
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists',
        code: 'USER_EXISTS',
      };
    }

    // 哈希密码并保存用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ username, email, passwordHash: hashedPassword });
    const savedUser = await this.userRepository.save(user);

    return {
      status: 'success',
      data: { id: savedUser.id, username, email },
      message: 'User registered successfully',
      code: 'SUCCESS_REGISTER',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<any>> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // 为了安全，不泄露用户是否存在，返回成功响应
      return {
        status: 'success',
        data: null,
        message: 'Password reset email sent',
        code: 'SUCCESS_FORGOT_PASSWORD',
      };
    }

    // 生成重置令牌并保存
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时有效期
    const reset = this.passwordResetRepository.create({ userId: user.id, token, expiresAt });
    await this.passwordResetRepository.save(reset);

    // TODO: 发送邮件逻辑（集成邮件服务）
    console.log(`Reset token for ${email}: ${token}`);

    return {
      status: 'success',
      data: null,
      message: 'Password reset email sent',
      code: 'SUCCESS_FORGOT_PASSWORD',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<any>> {
    const { token, newPassword } = resetPasswordDto;

    const reset = await this.passwordResetRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!reset || reset.expiresAt < new Date()) {
      throw {
        status: 'error',
        data: null,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      };
    }

    // 更新用户密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(reset.userId, { passwordHash: hashedPassword });

    // 失效令牌
    await this.passwordResetRepository.delete({ id: reset.id });

    return {
      status: 'success',
      data: null,
      message: 'Password reset successfully',
      code: 'SUCCESS_RESET_PASSWORD',
    };
  }
}