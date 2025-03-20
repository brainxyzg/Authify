import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationGuard } from './authentication.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BlacklistedToken } from '../entities/blacklisted-token.entity';
import { ExecutionContext, HttpException } from '@nestjs/common';

// Mock 依赖
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockJwtService = new JwtService({ secret: 'test-secret' });
const mockConfigService = new ConfigService({
  jwt: { secret: 'test-secret', algorithm: 'HS256' },
});
const mockBlacklistedTokenRepository = {
  findOneBy: jest.fn(),
};

// Mock ExecutionContext
const createMockContext = (authHeader?: string) => {
  const request = {
    headers: {
      authorization: authHeader,
    },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
};

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationGuard,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(BlacklistedToken),
          useValue: mockBlacklistedTokenRepository,
        },
      ],
    }).compile();

    guard = module.get<AuthenticationGuard>(AuthenticationGuard);
    jest
      .spyOn(mockConfigService, 'get')
      .mockImplementation((key: string) =>
        key === 'jwt' ? { secret: 'test-secret', algorithm: 'HS256' } : undefined,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for valid token', async () => {
      const context = createMockContext('Bearer valid-token');
      const decoded = { sub: '1', iat: 1234567890, exp: Math.floor(Date.now() / 1000) + 3600 };
      const verifySpy = jest.spyOn(mockJwtService, 'verify') as jest.Mock;
      verifySpy.mockResolvedValue(decoded);
      mockCacheManager.get.mockResolvedValue(null);
      mockBlacklistedTokenRepository.findOneBy.mockResolvedValue(null);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual(decoded);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
        algorithms: ['HS256'],
      });
    });

    it('should throw exception if no authorization header', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header',
            code: 'MISSING_TOKEN',
          },
          401,
        ),
      );
    });

    it('should throw exception if token is invalid', async () => {
      const context = createMockContext('Bearer invalid-token');
      const verifySpy = jest.spyOn(mockJwtService, 'verify') as jest.Mock;
      verifySpy.mockRejectedValue(new Error('Invalid token'));
      mockCacheManager.get.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          },
          401,
        ),
      );
    });

    // 其他测试用例...
  });

  describe('calculateRemainingTtl', () => {
    it('should calculate remaining TTL correctly', () => {
      const guardInstance = new AuthenticationGuard(
        mockCacheManager as any,
        mockJwtService,
        mockConfigService,
        mockBlacklistedTokenRepository as any,
      );
      const now = Math.floor(Date.now() / 1000);
      const ttl = guardInstance['calculateRemainingTtl'](now + 1800);
      expect(ttl).toBe(1800);
    });

    // 其他 TTL 测试用例...
  });
});
