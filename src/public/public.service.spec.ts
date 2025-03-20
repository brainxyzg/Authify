import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { PasswordReset } from '../common/entities/password-reset.entity';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};
const mockPasswordResetRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};
const mockMailerService = {
  sendMail: jest.fn(),
};

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(PasswordReset), useValue: mockPasswordResetRepository },
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });

      const result = await service.register(registerDto);
      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
      });
    });

    it('should return error if username already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      mockUserRepository.findOne.mockResolvedValue({ username: 'testuser' });

      const result = await service.register(registerDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Username already exists',
        code: 'USER_EXISTS',
      });
    });

    it('should return error if email already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      mockUserRepository.findOne.mockResolvedValue({ email: 'test@example.com' });

      const result = await service.register(registerDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Email already exists',
        code: 'USER_EXISTS',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      const forgotPasswordDto: ForgotPasswordDto = { email: 'test@example.com' };
      const user = { id: 1, email: 'test@example.com', username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockPasswordResetRepository.create.mockReturnValue({
        userId: 1,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });
      mockPasswordResetRepository.save.mockResolvedValue({});
      mockMailerService.sendMail.mockResolvedValue({});

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Password reset email sent');
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Reset Your Password',
        template: 'reset-password',
        context: { username: 'testuser', token: expect.any(String) },
      });
    });

    it('should return success even if email does not exist', async () => {
      const forgotPasswordDto: ForgotPasswordDto = { email: 'nonexistent@example.com' };
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Password reset email sent');
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'validToken',
        newPassword: 'newPassword123',
      };
      const reset = {
        id: 1,
        userId: 1,
        token: 'validToken',
        expiresAt: new Date(Date.now() + 10000),
        user: { id: 1 },
      };
      mockPasswordResetRepository.findOne.mockResolvedValue(reset);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      mockUserRepository.update.mockResolvedValue({});
      mockPasswordResetRepository.delete.mockResolvedValue({});

      const result = await service.resetPassword(resetPasswordDto);
      expect(result.status).toBe('success');
      expect(result.message).toBe('Password reset successfully');
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        passwordHash: 'hashedNewPassword',
      });
      expect(mockPasswordResetRepository.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return error if token is invalid', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalidToken',
        newPassword: 'newPassword123',
      };
      mockPasswordResetRepository.findOne.mockResolvedValue(null);

      const result = await service.resetPassword(resetPasswordDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    });

    it('should return error if token is expired', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'expiredToken',
        newPassword: 'newPassword123',
      };
      const reset = {
        id: 1,
        userId: 1,
        token: 'expiredToken',
        expiresAt: new Date(Date.now() - 10000),
      };
      mockPasswordResetRepository.findOne.mockResolvedValue(reset);

      const result = await service.resetPassword(resetPasswordDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    });
  });
});
