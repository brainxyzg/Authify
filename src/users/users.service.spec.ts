import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../common/entities/user.entity';
import { EmailVerification } from '../common/entities/email-verification.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUserInfoDto, ChangePasswordDto, VerifyEmailDto } from './models/users.dto';

// 声明 mockUser 变量，但不在顶层初始化
let mockUser: User;

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

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    // 在 beforeEach 中初始化 mockUser
    mockUser = {
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
      passwordHash: await bcrypt.hash('Passw0rd123', 10),
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [],
      refreshTokens: [],
      blacklistedTokens: [],
      twoFactorSetting: null,
      twoFactorBackupCodes: [],
      emailVerifications: [],
      passwordResets: [],
      loginMethods: [],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(EmailVerification), useValue: mockEmailVerificationRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCurrentUser', () => {
    it('should return user info', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.getCurrentUser(1);
      expect(result.status).toBe('success');
      expect(result.data.user_id).toBe('1');
    });
  });

  describe('updateUserInfo', () => {
    it('should update username', async () => {
      const updateDto: UpdateUserInfoDto = { username: 'newjohndoe' };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);
      mockUserRepository.save.mockResolvedValue({ ...mockUser, username: 'newjohndoe' });

      const result = await service.updateUserInfo(1, updateDto);
      expect(result.status).toBe('success');
      expect(result.data.username).toBe('newjohndoe');
    });

    it('should return error if username taken', async () => {
      const updateDto: UpdateUserInfoDto = { username: 'newjohndoe' };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce({ id: 2 });

      const result = await service.updateUserInfo(1, updateDto);
      expect(result.status).toBe('error');
      expect(result.code).toBe('USERNAME_TAKEN');
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      const changeDto: ChangePasswordDto = { old_password: 'Passw0rd123', new_password: 'NewPass123' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      // 使用 jest.mock 而不是 spyOn
      // jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never); // 删除这行

      const result = await service.changePassword(1, changeDto);
      expect(result.status).toBe('success');
    });

    it('should return error if old password incorrect', async () => {
      const changeDto: ChangePasswordDto = { old_password: 'wrong', new_password: 'NewPass123' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.changePassword(1, changeDto);
      expect(result.status).toBe('error');
      expect(result.code).toBe('INCORRECT_PASSWORD');
    });
  });

  describe('sendVerifyEmail', () => {
    it('should send verification email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockEmailVerificationRepository.create.mockReturnValue({ code: 'ABC123' });
      mockEmailVerificationRepository.save.mockResolvedValue({});

      const result = await service.sendVerifyEmail(1);
      expect(result.status).toBe('success');
    });

    it('should return error if email already verified', async () => {
      // 修改 mock 用户的 emailVerified 属性为 true
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, emailVerified: true });

      const result = await service.sendVerifyEmail(1);
      expect(result.status).toBe('error');
      expect(result.code).toBe('EMAIL_ALREADY_VERIFIED');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const verifyDto: VerifyEmailDto = { code: 'ABC123' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockEmailVerificationRepository.findOne.mockResolvedValue({ code: 'ABC123', expiresAt: new Date(Date.now() + 1000) });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const result = await service.verifyEmail(1, verifyDto);
      expect(result.status).toBe('success');
      expect(result.data.is_email_verified).toBe(true);
    });

    it('should return error if code invalid', async () => {
      const verifyDto: VerifyEmailDto = { code: 'XYZ789' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockEmailVerificationRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyEmail(1, verifyDto);
      expect(result.status).toBe('error');
      expect(result.code).toBe('INVALID_CODE');
    });
  });
});