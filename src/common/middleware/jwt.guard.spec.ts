import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard } from './jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Mock 依赖
const mockJwtService = {
  verify: jest.fn(),
};
const mockConfigService = {
  get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined)),
};
const mockReflector = {
  getAllAndOverride: jest.fn(),
};

// Mock ExecutionContext
const createMockContext = (authHeader?: string, isPublic?: boolean): ExecutionContext => {
  const request = {
    headers: {
      authorization: authHeader,
    },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
};

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should throw error for missing authorization header', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Missing or invalid Authorization header',
            code: 'MISSING_TOKEN',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should throw error for invalid authorization header format', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext('Basic token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Missing or invalid Authorization header',
            code: 'MISSING_TOKEN',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should return true for valid token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext('Bearer valid-token');
      const decoded = { sub: '1', iat: 1234567890, exp: Math.floor(Date.now() / 1000) + 3600 };
      mockJwtService.verify.mockResolvedValue(decoded);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(context.switchToHttp().getRequest().user).toEqual(decoded);
    });

    it('should throw error for invalid or expired token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext('Bearer invalid-token');
      mockJwtService.verify.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-token', {
        secret: 'test-secret',
      });
    });
  });
});
