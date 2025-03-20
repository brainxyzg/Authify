import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TwoFactorService } from '../two-factor/twofactor.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './models/login.dto';
import { RefreshTokenDto } from './models/refresh-token.dto';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
};
const mockRefreshTokenRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};
const mockConfigService = {
  get: jest.fn(
    (key: string, defaultValue?: any) =>
      ({
        JWT_ACCESS_TOKEN_EXPIRY: '1h',
        JWT_REFRESH_TOKEN_EXPIRY: '7d',
      })[key] ?? defaultValue,
  ),
};
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockTwoFactorService = {
  validate2FACode: jest.fn(),
};

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully without 2FA', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedPass',
        twoFactorSetting: null,
      };
      const loginDto: LoginDto = { username: 'testuser', password: 'pass' };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(loginDto);
      expect(result.status).toBe('success');
      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should login successfully with valid 2FA', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedPass',
        twoFactorSetting: { isEnabled: true },
      };
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'pass',
        twoFactorCode: '123456',
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTwoFactorService.validate2FACode.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(loginDto);
      expect(result.status).toBe('success');
      expect(mockTwoFactorService.validate2FACode).toHaveBeenCalledWith(1, '123456');
    });

    it('should return error if credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.login({ username: 'testuser', password: 'wrongpass' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should return error if 2FA code is missing', async () => {
      const user = { id: 1, username: 'testuser', twoFactorSetting: { isEnabled: true } };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'testuser', password: 'pass' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Two-factor code required',
        code: '2FA_REQUIRED',
      });
    });

    it('should return error if 2FA code is invalid', async () => {
      const user = { id: 1, username: 'testuser', twoFactorSetting: { isEnabled: true } };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTwoFactorService.validate2FACode.mockResolvedValue(false);

      const result = await service.login({
        username: 'testuser',
        password: 'pass',
        twoFactorCode: 'wrongcode',
      });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid 2FA code',
        code: 'INVALID_2FA_CODE',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const token = {
        tokenHash: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 10000),
        user: { id: 1 },
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(token);
      mockCacheManager.get.mockResolvedValue(null);
      mockJwtService.verify.mockReturnValue({ sub: 1, username: 'testuser' });
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockRefreshTokenRepository.update.mockResolvedValue({});
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.refreshToken({ refreshToken: 'old-refresh-token' });
      expect(result.status).toBe('success');
      expect(result.data.accessToken).toBe('new-access-token');
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenHash: 'old-refresh-token' },
        expect.objectContaining({ tokenHash: 'new-refresh-token' }),
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'blacklist:old-refresh-token',
        'true',
        604800,
      );
    });

    it('should return error if refresh token is invalid', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.refreshToken({ refreshToken: 'invalid-token' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('should return error if refresh token is blacklisted', async () => {
      const token = { tokenHash: 'refresh-token', expiresAt: new Date(Date.now() + 10000) };
      mockRefreshTokenRepository.findOne.mockResolvedValue(token);
      mockCacheManager.get.mockResolvedValue('true');

      const result = await service.refreshToken({ refreshToken: 'refresh-token' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Refresh token has been revoked',
        code: 'REVOKED_REFRESH_TOKEN',
      });
    });

    it('should return error if token signature is invalid', async () => {
      const token = { tokenHash: 'refresh-token', expiresAt: new Date(Date.now() + 10000) };
      mockRefreshTokenRepository.findOne.mockResolvedValue(token);
      mockCacheManager.get.mockResolvedValue(null);
      // 修改这一行，使用正确的 Jest mock 方法
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await service.refreshToken({ refreshToken: 'refresh-token' });
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid refresh token signature',
        code: 'INVALID_REFRESH_TOKEN',
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = { tokenHash: 'refresh-token', user: { id: 1 } };
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(refreshToken);
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);
      mockRefreshTokenRepository.delete.mockResolvedValue({});

      const result = await service.logout('access-token');
      expect(result.status).toBe('success');
      expect(mockCacheManager.set).toHaveBeenCalledWith('blacklist:access-token', 'true', 3600);
      expect(mockCacheManager.set).toHaveBeenCalledWith('blacklist:refresh-token', 'true', 604800);
      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith({
        tokenHash: 'refresh-token',
      });
    });

    it('should return error if token is invalid', async () => {
      // 修改这一行，使用正确的 Jest mock 方法
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.logout('invalid-token');
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    });

    it('should return error if no active session', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.logout('access-token');
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'No active session found',
        code: 'NO_ACTIVE_SESSION',
      });
    });

    it('should return error if already logged out', async () => {
      const refreshToken = { tokenHash: 'refresh-token', user: { id: 1 } };
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(refreshToken);
      mockCacheManager.get.mockResolvedValue('true');

      const result = await service.logout('access-token');
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Already logged out',
        code: 'ALREADY_LOGGED_OUT',
      });
    });
  });
});
