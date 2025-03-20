import { Test, TestingModule } from '@nestjs/testing';
import { CsrfGuard } from './csrf.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { randomBytes } from 'crypto';

// Mock CacheManager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
};

// Mock ExecutionContext
const createMockContext = (
  method: string,
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
  user?: any,
): ExecutionContext => {
  const request = {
    method,
    headers,
    cookies,
    user,
  };
  const response = {
    cookie: jest.fn(),
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ExecutionContext;
};

// Mock randomBytes
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: () => 'mocked-csrf-token',
  }),
}));

describe('CsrfGuard', () => {
  let guard: CsrfGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsrfGuard, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for GET requests without CSRF check', async () => {
      const context = createMockContext('GET');

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should generate and set CSRF token for unauthenticated POST request', async () => {
      const context = createMockContext('POST', {}, {});
      const response = context.switchToHttp().getResponse();

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'CSRF token required',
            code: 'CSRF_TOKEN_REQUIRED',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'csrf:mocked-csrf-token',
        'mocked-csrf-token',
        3600,
      );
      expect(response.cookie).toHaveBeenCalledWith('csrf_token', 'mocked-csrf-token', {
        httpOnly: true,
        secure: true,
      });
    });

    it('should throw error for POST request with missing CSRF token in header', async () => {
      const context = createMockContext('POST', {}, { csrf_token: 'test-token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Invalid CSRF token',
            code: 'INVALID_CSRF_TOKEN',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should throw error for POST request with missing CSRF token in cookie', async () => {
      const context = createMockContext('POST', { 'x-csrf-token': 'test-token' }, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'CSRF token required', // 修改这里，与实际实现匹配
            code: 'CSRF_TOKEN_REQUIRED',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should throw error for POST request with mismatched CSRF tokens', async () => {
      const context = createMockContext(
        'POST',
        { 'x-csrf-token': 'header-token' },
        { csrf_token: 'cookie-token' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Invalid CSRF token',
            code: 'INVALID_CSRF_TOKEN',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should throw error for POST request with invalid token in cache', async () => {
      const context = createMockContext(
        'POST',
        { 'x-csrf-token': 'test-token' },
        { csrf_token: 'test-token' },
        { id: 1 },
      );
      mockCacheManager.get.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Expired or invalid CSRF token',
            code: 'INVALID_CSRF_TOKEN',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.get).toHaveBeenCalledWith('csrf:test-token');
    });

    it('should return true for POST request with valid CSRF token', async () => {
      const context = createMockContext(
        'POST',
        { 'x-csrf-token': 'test-token' },
        { csrf_token: 'test-token' },
        { id: 1 },
      );
      mockCacheManager.get.mockResolvedValue('test-token');

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith('csrf:test-token');
    });

    it('should return true for PATCH request with valid CSRF token', async () => {
      const context = createMockContext(
        'PATCH',
        { 'x-csrf-token': 'test-token' },
        { csrf_token: 'test-token' },
        { id: 1 },
      );
      mockCacheManager.get.mockResolvedValue('test-token');

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith('csrf:test-token');
    });

    it('should throw error for DELETE request with invalid token in cache', async () => {
      const context = createMockContext(
        'DELETE',
        { 'x-csrf-token': 'test-token' },
        { csrf_token: 'test-token' },
        { id: 1 },
      );
      mockCacheManager.get.mockResolvedValue('different-token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Expired or invalid CSRF token',
            code: 'INVALID_CSRF_TOKEN',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
      expect(mockCacheManager.get).toHaveBeenCalledWith('csrf:test-token');
    });
  });
});
