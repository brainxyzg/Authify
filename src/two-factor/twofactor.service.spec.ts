// 在文件顶部添加 bcrypt 模拟
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-code'),
  compare: jest.fn().mockResolvedValue(true),
  hashSync: jest.fn().mockReturnValue('hashed-password'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TwoFactorService } from './twofactor.service';
import { User } from '../common/entities/user.entity';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import * as bcrypt from 'bcrypt';
import { Verify2FADto } from './models/twofactor.dto';
import { authenticator } from 'otplib';

jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('mock-qr-url') }));

// 修改 mockUser 定义，使用模拟的 hashSync
const mockUser: User = {
  id: 1,
  username: 'johndoe',
  email: 'john@example.com',
  passwordHash: 'hashed-password', // 使用模拟的哈希值
  isActive: true,
  emailVerified: false,
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

const mockTwoFactorSetting = {
  id: 1,
  user: mockUser,
  secret: 'JBSWY3DPEHPK3PXP',
  isEnabled: false,
};

const mockUserRepository = {
  findOne: jest.fn(),
};
const mockTwoFactorSettingRepository = {
  findOne: jest.fn(), // 添加 findOne 方法
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};
const mockBackupCodeRepository = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findOne: jest.fn(),
};

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(TwoFactorSetting), useValue: mockTwoFactorSettingRepository },
        { provide: getRepositoryToken(TwoFactorBackupCode), useValue: mockBackupCodeRepository },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);

    // 确保 service 中的 generateBackupCodesInternal 方法存在
    jest
      .spyOn(service as any, 'generateBackupCodesInternal')
      .mockReturnValue(['12345678', '87654321']);
  });

  afterEach(() => jest.clearAllMocks());

  describe('enable2FA', () => {
    it('should initiate 2FA setup', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTwoFactorSettingRepository.findOne.mockResolvedValue(null); // 模拟找不到设置
      mockTwoFactorSettingRepository.create.mockReturnValue(mockTwoFactorSetting);
      mockTwoFactorSettingRepository.save.mockResolvedValue(mockTwoFactorSetting);
      mockBackupCodeRepository.create.mockReturnValue({});
      mockBackupCodeRepository.save.mockResolvedValue([]);

      const result = await service.enable2FA(1);
      expect(result.status).toBe('success');
      expect(result.data.secret).toBeDefined();
      expect(result.data.qr_code_url).toBe('mock-qr-url');
      expect(result.data.backup_codes.length).toBe(2);
    });

    it('should return error if 2FA already enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSetting: { ...mockTwoFactorSetting, isEnabled: true },
      });

      const result = await service.enable2FA(1);
      expect(result.status).toBe('error');
      expect(result.code).toBe('2FA_ALREADY_ENABLED');
    });
  });

  describe('verify2FA', () => {
    it('should verify and enable 2FA', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSetting: mockTwoFactorSetting,
      });
      jest.spyOn(authenticator, 'verify').mockReturnValue(true);
      mockTwoFactorSettingRepository.save.mockResolvedValue(mockTwoFactorSetting);

      const verifyDto: Verify2FADto = { code: '123456' };
      const result = await service.verify2FA(1, verifyDto);
      expect(result.status).toBe('success');
      expect(result.data.two_factor_enabled).toBe(true);
    });

    it('should return error if code invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSetting: mockTwoFactorSetting,
      });
      jest.spyOn(authenticator, 'verify').mockReturnValue(false);

      const verifyDto: Verify2FADto = { code: '123456' };
      const result = await service.verify2FA(1, verifyDto);
      expect(result.status).toBe('error');
      expect(result.code).toBe('INVALID_2FA_CODE');
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSetting: { ...mockTwoFactorSetting, isEnabled: true },
      });
      mockTwoFactorSettingRepository.update.mockResolvedValue({ affected: 1 });
      mockBackupCodeRepository.delete.mockResolvedValue({ affected: 2 });

      const result = await service.disable2FA(1);
      expect(result.status).toBe('success');
    });

    it('should return error if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.disable2FA(1);
      expect(result.status).toBe('error');
      expect(result.code).toBe('2FA_NOT_ENABLED');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSetting: { ...mockTwoFactorSetting, isEnabled: true },
      });
      mockBackupCodeRepository.delete.mockResolvedValue({ affected: 0 });
      mockBackupCodeRepository.create.mockReturnValue({});
      mockBackupCodeRepository.save.mockResolvedValue([]);
      // 删除这行，因为我们已经在顶部模拟了整个模块
      // jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-code' as never);

      const result = await service.generateBackupCodes(1);
      expect(result.status).toBe('success');
      expect(result.data.backup_codes.length).toBe(2);
    });

    it('should return error if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.generateBackupCodes(1);
      expect(result.status).toBe('error');
      expect(result.code).toBe('2FA_NOT_ENABLED');
    });
  });
});
