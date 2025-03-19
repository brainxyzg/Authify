import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { RedisService } from '../common/services/redis.service';
import { TwoFactorService } from '../two-factor/twofactor.service';
import { LoginDto } from './models/login.dto';
import { RefreshTokenDto } from './models/refresh-token.dto';
import * as bcrypt from 'bcrypt';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
};
const mockRefreshTokenRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};
const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};
const mockConfigService = {
  get: jest.fn(),
};
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockTwoFactorService = {
  validate2FACode: jest.fn(),
};

// Mock 数据
let mockUser: User;
let mockRefreshToken: RefreshToken;
const mockTwoFactorSetting = {
  isEnabled: true,
  secret: 'ABC123XYZ',
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // 在测试前初始化需要 await 的数据
    mockUser = {
      id: 1,
      username: 'johndoe',
      passwordHash: await bcrypt.hash('Passw0rd123', 10),
    } as User;

    mockRefreshToken = {
      tokenHash: 'refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: mockUser,
    } as RefreshToken;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 测试 login 方法
  describe('login', () => {
    const loginDto: LoginDto = { username: 'johndoe', password: 'Passw0rd123' };

    it('should successfully login without 2FA', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // username 查询
        .mockResolvedValueOnce(mockUser); // relations 查询
      mockConfigService.get.mockReturnValue('1h').mockReturnValueOnce('7d');
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.login(loginDto);
      expect(result).toEqual({
        status: 'success',
        data: {
          accessToken: 'access-token',
          tokenType: 'bearer',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
        message: 'Login successful',
        code: 'SUCCESS_LOGIN',
      });
      expect(mockTwoFactorService.validate2FACode).not.toHaveBeenCalled();
    });

    it('should successfully login with valid 2FA', async () => {
      const loginDtoWith2FA = { ...loginDto, twoFactorCode: '123456' };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, twoFactorSetting: mockTwoFactorSetting });
      mockTwoFactorService.validate2FACode.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.login(loginDtoWith2FA);
      expect(result.status).toBe('success');
      expect(mockTwoFactorService.validate2FACode).toHaveBeenCalledWith(1, '123456');
    });

    it('should return error if 2FA code is missing', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, twoFactorSetting: mockTwoFactorSetting });

      const result = await service.login(loginDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Two-factor code required',
        code: '2FA_REQUIRED',
      });
    });

    it('should return error if credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.login(loginDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  // 测试 refreshToken 方法
  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = { refreshToken: 'refresh-token' };

    it('should successfully refresh token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRedisService.get.mockResolvedValue(null);
      mockJwtService.verify.mockReturnValue({ sub: 1, username: 'johndoe' });
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.refreshToken(refreshTokenDto);
      expect(result).toEqual({
        status: 'success',
        data: {
          accessToken: 'new-access-token',
          tokenType: 'bearer',
          expiresIn: 3600,
        },
        message: 'Token refreshed successfully',
        code: 'SUCCESS_REFRESH_TOKEN',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith('blacklist:refresh-token', 'true', 7 * 24 * 60 * 60);
    });

    it('should return error if refresh token is invalid or expired', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.refreshToken(refreshTokenDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('should return error if token is blacklisted', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRedisService.get.mockResolvedValue('true');

      const result = await service.refreshToken(refreshTokenDto);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    });
  });

  // 测试 logout 方法
  describe('logout', () => {
    const token = 'access-token';

    it('should successfully logout', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRedisService.get.mockResolvedValue(null);
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.logout(token);
      expect(result).toEqual({
        status: 'success',
        data: null,
        message: 'Logged out successfully',
        code: 'SUCCESS_LOGOUT',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith('blacklist:access-token', 'true', 3600);
      expect(mockRedisService.set).toHaveBeenCalledWith('blacklist:refresh-token', 'true', 7 * 24 * 60 * 60);
    });

    it('should return error if token is invalid', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.logout(token);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or already logged out',
        code: 'INVALID_TOKEN',
      });
    });

    it('should return error if token is blacklisted', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRedisService.get.mockResolvedValue('true');

      const result = await service.logout(token);
      expect(result).toEqual({
        status: 'error',
        data: null,
        message: 'Invalid or already logged out',
        code: 'INVALID_TOKEN',
      });
    });
  });
});