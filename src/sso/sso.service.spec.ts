import { Test, TestingModule } from '@nestjs/testing';
import { SsoService } from './sso.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SsoProvider } from './models/sso.dto';

// Mock 依赖
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockLoginMethodRepository = {
  create: jest.fn(),
  save: jest.fn(),
};
const mockJwtService = {
  sign: jest.fn(),
};
const mockConfigService = {
  get: jest.fn(
    (key: string, defaultValue?: any) =>
      ({
        BASE_URL: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: 'google-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GITHUB_CLIENT_ID: 'github-id',
        GITHUB_CLIENT_SECRET: 'github-secret',
        JWT_ACCESS_TOKEN_EXPIRY_SECONDS: 3600,
        JWT_ACCESS_TOKEN_EXPIRY: '1h',
      })[key] ?? defaultValue,
  ),
};
const mockCacheManager = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

// 确保 fetch 被正确模拟并带有类型
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('SsoService', () => {
  let service: SsoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(LoginMethod), useValue: mockLoginMethodRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSsoCallback', () => {
    it('should handle GitHub SSO callback successfully', async () => {
      const state = 'validState';
      mockCacheManager.get.mockResolvedValue(SsoProvider.GITHUB);
      mockCacheManager.del.mockResolvedValue(undefined);

      // 模拟 GitHub token 和 user info 的 fetch 调用
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'github-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ email: 'test@example.com', login: 'testuser' }),
        });

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        emailVerified: true,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockLoginMethodRepository.create.mockReturnValue({});
      mockLoginMethodRepository.save.mockResolvedValue({});

      const result = await service.handleSsoCallback(SsoProvider.GITHUB, 'code', state);
      expect(result.status).toBe('success');
      expect(result.data.access_token).toBe('jwt-token');
      expect(result.data.user.username).toBe('testuser');
      expect(result.data.user.email).toBe('test@example.com');
      expect(result.data.expires_in).toBe(3600);
      expect(mockCacheManager.del).toHaveBeenCalledWith(`sso:state:${state}`);
    });

    it('should return error if state is invalid', async () => {
      const state = 'invalidState';
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.handleSsoCallback(SsoProvider.GITHUB, 'code', state);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid or expired CSRF state');
      expect(result.code).toBe('INVALID_CSRF_STATE');
    });

    it('should return error if fetch token fails', async () => {
      const state = 'validState';
      mockCacheManager.get.mockResolvedValue(SsoProvider.GITHUB);
      mockCacheManager.del.mockResolvedValue(undefined);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid code' }),
      });

      const result = await service.handleSsoCallback(SsoProvider.GITHUB, 'code', state);
      expect(result.status).toBe('error');
      expect(result.message).toContain('SSO login failed');
      expect(result.code).toBe('INVALID_SSO_CODE');
    });
  });
});
