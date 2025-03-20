import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { EmailVerification } from '../common/entities/email-verification.entity';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { UpdateUserInfoDto, ChangePasswordDto, VerifyEmailDto } from './models/users.dto';

// Mock Repository 和 MailerService
const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};
const mockEmailVerificationRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};
const mockMailerService = {
  sendMail: jest.fn(),
};

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(EmailVerification),
          useValue: mockEmailVerificationRepository,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user info if user exists', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        emailVerified: true,
        userRoles: [{ role: { name: 'user' } }],
        twoFactorSetting: { isEnabled: true },
      };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.getCurrentUser(1);
      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        user_id: '1',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        is_email_verified: true,
        two_factor_enabled: true,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['userRoles', 'twoFactorSetting'],
      });
    });

    it('should return error if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.getCurrentUser(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('updateUserInfo', () => {
    it('should update username successfully', async () => {
      const user = { id: 1, username: 'olduser' };
      const updateDto: UpdateUserInfoDto = { username: 'newuser' };
      mockUserRepository.findOne
        .mockResolvedValueOnce(user) // find by id
        .mockResolvedValueOnce(null); // check username availability
      mockUserRepository.save.mockResolvedValue({ ...user, username: 'newuser' });

      const result = await service.updateUserInfo(1, updateDto);
      expect(result.status).toBe('success');
      expect(result.data.username).toBe('newuser');
      expect(mockUserRepository.save).toHaveBeenCalledWith({ id: 1, username: 'newuser' });
    });

    it('should return error if username is taken', async () => {
      const user = { id: 1, username: 'olduser' };
      const updateDto: UpdateUserInfoDto = { username: 'takenuser' };
      mockUserRepository.findOne
        .mockResolvedValueOnce(user) // find by id
        .mockResolvedValueOnce({ id: 2, username: 'takenuser' }); // username taken

      const result = await service.updateUserInfo(1, updateDto);
      expect(result).toEqual({
        status: 'error',
        data: { username: 'olduser' },
        message: 'Username already taken',
        code: 'USERNAME_TAKEN',
      });
    });

    it('should return error if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const updateDto: UpdateUserInfoDto = { username: 'newuser' };

      const result = await service.updateUserInfo(1, updateDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = { id: 1, passwordHash: 'hashedOldPass' };
      const changePasswordDto: ChangePasswordDto = {
        old_password: 'oldpass',
        new_password: 'newpass',
      };
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPass');
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, passwordHash: 'hashedNewPass' });

      const result = await service.changePassword(1, changePasswordDto);
      expect(result.status).toBe('success');
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        id: 1,
        passwordHash: 'hashedNewPass',
      });
    });

    it('should return error if old password is incorrect', async () => {
      const user = { id: 1, passwordHash: 'hashedOldPass' };
      const changePasswordDto: ChangePasswordDto = {
        old_password: 'wrongpass',
        new_password: 'newpass',
      };
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.changePassword(1, changePasswordDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Incorrect old password',
        code: 'INCORRECT_PASSWORD',
      });
    });
  });

  describe('sendVerifyEmail', () => {
    it('should send verification email successfully', async () => {
      const user = { id: 1, email: 'test@example.com', emailVerified: false, username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockEmailVerificationRepository.create.mockReturnValue({
        user,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });
      mockEmailVerificationRepository.save.mockResolvedValue({});
      mockMailerService.sendMail.mockResolvedValue({});

      const result = await service.sendVerifyEmail(1);
      expect(result.status).toBe('success');
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should return error if email already verified', async () => {
      const user = { id: 1, emailVerified: true };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.sendVerifyEmail(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Email already verified',
        code: 'EMAIL_ALREADY_VERIFIED',
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const user = { id: 1, emailVerified: false };
      const verification = {
        id: 1,
        user,
        token: 'ABC123',
        expiresAt: new Date(Date.now() + 10000),
      };
      const verifyDto: VerifyEmailDto = { code: 'ABC123' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockEmailVerificationRepository.findOne.mockResolvedValue(verification);
      mockUserRepository.save.mockResolvedValue({ ...user, emailVerified: true });
      mockEmailVerificationRepository.delete.mockResolvedValue({});

      const result = await service.verifyEmail(1, verifyDto);
      expect(result.status).toBe('success');
      expect(result.data.is_email_verified).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith({ id: 1, emailVerified: true });
    });

    it('should return error if code is invalid or expired', async () => {
      const user = { id: 1, emailVerified: false };
      const verifyDto: VerifyEmailDto = { code: 'WRONG' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockEmailVerificationRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyEmail(1, verifyDto);
      expect(result).toEqual({
        status: 'error',
        data: { is_email_verified: false },
        message: 'Invalid or expired verification code',
        code: 'INVALID_CODE',
      });
    });
  });
});
