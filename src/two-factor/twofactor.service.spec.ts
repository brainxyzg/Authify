import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './twofactor.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { TwoFactorSetting } from '../common/entities/two-factor-setting.entity';
import { TwoFactorBackupCode } from '../common/entities/two-factor-backup-code.entity';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
};
const mockTwoFactorRepository = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};
const mockBackupCodeRepository = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// Mock bcrypt, otplib 和 qrcode
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
    options: {},
  },
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(TwoFactorSetting), useValue: mockTwoFactorRepository },
        { provide: getRepositoryToken(TwoFactorBackupCode), useValue: mockBackupCodeRepository },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enable2FA', () => {
    it('should enable 2FA successfully', async () => {
      const user = { id: 1, username: 'testuser', twoFactorSetting: null };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.generateSecret as jest.Mock).mockReturnValue('SECRET');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp');
      (toDataURL as jest.Mock).mockResolvedValue('qrCodeUrl');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      mockTwoFactorRepository.create.mockReturnValue({ user, secret: 'SECRET', isEnabled: false });
      mockTwoFactorRepository.save.mockResolvedValue({});
      mockBackupCodeRepository.create.mockReturnValue({});
      mockBackupCodeRepository.save.mockResolvedValue({});

      const result = await service.enable2FA(1);
      expect(result.status).toBe('success');
      expect(result.data.secret).toBe('SECRET');
      expect(result.data.qr_code_url).toBe('qrCodeUrl');
      expect(result.data.backup_codes).toHaveLength(2);
    });

    it('should return error if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.enable2FA(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    });

    it('should return error if 2FA already enabled', async () => {
      const user = { id: 1, twoFactorSetting: { isEnabled: true } };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.enable2FA(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: '2FA already enabled',
        code: '2FA_ALREADY_ENABLED',
      });
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA successfully', async () => {
      const user = { id: 1, twoFactorSetting: { secret: 'SECRET', isEnabled: false } };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockTwoFactorRepository.save.mockResolvedValue({});

      const result = await service.verify2FA(1, { code: '123456' });
      expect(result.status).toBe('success');
      expect(result.data.two_factor_enabled).toBe(true);
      expect(mockTwoFactorRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: true, enabledAt: expect.any(Date) }),
      );
    });

    it('should return error if code is invalid', async () => {
      const user = { id: 1, twoFactorSetting: { secret: 'SECRET', isEnabled: false } };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verify2FA(1, { code: 'wrongcode' });
      expect(result).toEqual({
        status: 'error',
        data: { two_factor_enabled: false },
        message: 'Verification failed',
        code: 'INVALID_2FA_CODE',
      });
    });

    it('should return error if 2FA not initiated', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, twoFactorSetting: null });

      const result = await service.verify2FA(1, { code: '123456' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: '2FA not initiated',
        code: '2FA_NOT_INITIATED',
      });
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA successfully', async () => {
      const user = { id: 1, twoFactorSetting: { isEnabled: true } };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockTwoFactorRepository.update.mockResolvedValue({});
      mockBackupCodeRepository.delete.mockResolvedValue({});

      const result = await service.disable2FA(1);
      expect(result.status).toBe('success');
      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(
        { userId: 1 },
        { isEnabled: false, enabledAt: null },
      );
      expect(mockBackupCodeRepository.delete).toHaveBeenCalledWith({ user: { id: 1 } });
    });

    it('should return error if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        twoFactorSetting: { isEnabled: false },
      });

      const result = await service.disable2FA(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      });
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes successfully', async () => {
      const user = { id: 1, twoFactorSetting: { isEnabled: true } };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      mockBackupCodeRepository.delete.mockResolvedValue({});
      mockBackupCodeRepository.create.mockReturnValue({});
      mockBackupCodeRepository.save.mockResolvedValue({});

      const result = await service.generateBackupCodes(1);
      expect(result.status).toBe('success');
      expect(result.data.backup_codes).toHaveLength(2);
    });

    it('should return error if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        twoFactorSetting: { isEnabled: false },
      });

      const result = await service.generateBackupCodes(1);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      });
    });
  });

  describe('validate2FACode', () => {
    it('should validate TOTP code successfully', async () => {
      const user = {
        id: 1,
        twoFactorSetting: { isEnabled: true, secret: 'SECRET' },
        twoFactorBackupCodes: [],
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.validate2FACode(1, '123456');
      expect(result).toBe(true);
    });

    it('should validate backup code successfully', async () => {
      const user = {
        id: 1,
        twoFactorSetting: { isEnabled: true, secret: 'SECRET' },
        twoFactorBackupCodes: [{ id: 1, codeHash: 'hashedCode' }],
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockBackupCodeRepository.delete.mockResolvedValue({});

      const result = await service.validate2FACode(1, 'backupcode');
      expect(result).toBe(true);
      expect(mockBackupCodeRepository.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return false if code is invalid', async () => {
      const user = {
        id: 1,
        twoFactorSetting: { isEnabled: true, secret: 'SECRET' },
        twoFactorBackupCodes: [{ id: 1, codeHash: 'hashedCode' }],
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validate2FACode(1, 'wrongcode');
      expect(result).toBe(false);
    });

    it('should return false if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        twoFactorSetting: { isEnabled: false },
      });

      const result = await service.validate2FACode(1, '123456');
      expect(result).toBe(false);
    });
  });
});
