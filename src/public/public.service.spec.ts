// 在文件顶部添加模块模拟
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  compare: jest.fn().mockResolvedValue(true)
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicService } from './public.service';
import { User } from '../common/entities/user.entity';
import { PasswordReset } from '../common/entities/password-reset.entity';
import { RegisterDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};
const mockPasswordResetRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// 声明变量但不初始化
let mockUser: User;
let mockPasswordReset: PasswordReset;

describe('PublicService', () => {
  let service: PublicService;
  let userRepository: Repository<User>;
  let passwordResetRepository: Repository<PasswordReset>;

  beforeEach(async () => {
    // 在函数内部初始化需要 await 的数据
    mockUser = {
      id: 1,
      username: 'johndoe',
      email: 'johndoe@example.com',
      passwordHash: 'mocked-hash', // 使用模拟的哈希值
    } as User;

    mockPasswordReset = {
      id: 1,
      userId: mockUser.id,
      token: 'mock-reset-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
      user: mockUser,
    } as PasswordReset;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(PasswordReset), useValue: mockPasswordResetRepository },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordResetRepository = module.get<Repository<PasswordReset>>(getRepositoryToken(PasswordReset));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 测试 register 方法
  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'johndoe',
      email: 'johndoe@example.com',
      password: 'Passw0rd123',
    };

    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // 用户不存在
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      // 删除 spyOn 调用，因为我们已经在顶部模拟了整个模块
      // jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockUser.passwordHash as never);

      const result = await service.register(registerDto);
      expect(result).toEqual({
        status: 'success',
        data: { id: 1, username: 'johndoe', email: 'johndoe@example.com' },
        message: 'User registered successfully',
        code: 'SUCCESS_REGISTER',
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'johndoe',
        email: 'johndoe@example.com',
        passwordHash: 'mocked-hash',
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should return error if username already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Username already exists',
        code: 'USER_EXISTS',
      });
    });

    it('should return error if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, username: 'otheruser' });

      const result = await service.register(registerDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Email already exists',
        code: 'USER_EXISTS',
      });
    });
  });

  // 测试 forgotPassword 方法
  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = { email: 'johndoe@example.com' };

    it('should generate reset token if user exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordResetRepository.create.mockReturnValue(mockPasswordReset);
      mockPasswordResetRepository.save.mockResolvedValue(mockPasswordReset);

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result).toEqual({
        status: 'success',
        data: null,
        message: 'Password reset email sent',
        code: 'SUCCESS_FORGOT_PASSWORD',
      });
      expect(passwordResetRepository.save).toHaveBeenCalled();
    });

    it('should return success even if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result).toEqual({
        status: 'success',
        data: null,
        message: 'Password reset email sent',
        code: 'SUCCESS_FORGOT_PASSWORD',
      });
      expect(passwordResetRepository.save).not.toHaveBeenCalled();
    });
  });

  // 测试 resetPassword 方法
  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'mock-reset-token',
      newPassword: 'NewPassw0rd123',
    };

    it('should successfully reset password', async () => {
      mockPasswordResetRepository.findOne.mockResolvedValue(mockPasswordReset);
      // 删除 spyOn 调用
      // jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password' as never);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockPasswordResetRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.resetPassword(resetPasswordDto);
      expect(result).toEqual({
        status: 'success',
        data: null,
        message: 'Password reset successfully',
        code: 'SUCCESS_RESET_PASSWORD',
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { passwordHash: 'mocked-hash' });
      expect(passwordResetRepository.delete).toHaveBeenCalledWith({ id: mockPasswordReset.id });
    });

    it('should throw error if reset token is invalid or expired', async () => {
      mockPasswordResetRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    });

    it('should throw error if reset token is expired', async () => {
      const expiredReset = { ...mockPasswordReset, expiresAt: new Date(Date.now() - 1000) };
      mockPasswordResetRepository.findOne.mockResolvedValue(expiredReset);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    });
  });
});