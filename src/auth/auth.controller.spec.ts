import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './models/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './models/refresh-token.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock AuthService
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

// Mock Request 对象
const mockRequest = {
  headers: {
    authorization: 'Bearer mock-token',
  },
  user: { sub: 'user-id-123' }, // 模拟 JWT 解析后的用户
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true }) // Mock JwtGuard，默认通过
      .overrideGuard(RateLimitingGuard)
      .useValue({ canActivate: () => true }) // Mock RateLimitingGuard，默认通过
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // 清理 mock 数据
  });

  // 测试 login 端点
  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'johndoe',
      password: 'Passw0rd123',
      twoFactorCode: '123456',
    };

    it('should successfully login and return tokens', async () => {
      const successResponse: ApiResponse<LoginResponseDto> = {
        status: 'success',
        data: {
          accessToken: 'access-token',
          tokenType: 'bearer',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
        message: 'Login successful',
        code: 'SUCCESS_LOGIN',
      };
      mockAuthService.login.mockResolvedValue(successResponse);

      const result = await controller.login(loginDto);
      expect(result).toEqual(successResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw HttpException on login error', async () => {
      const errorResponse: ApiResponse<null> = {
        status: 'error',
        data: null,
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      };
      mockAuthService.login.mockResolvedValue(errorResponse);

      await expect(controller.login(loginDto)).rejects.toThrow(
        new HttpException(errorResponse, HttpStatus.UNAUTHORIZED),
      );
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  // 测试 refreshToken 端点
  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'refresh-token',
    };

    it('should successfully refresh token', async () => {
      const successResponse: ApiResponse<RefreshTokenResponseDto> = {
        status: 'success',
        data: {
          accessToken: 'new-access-token',
          tokenType: 'bearer',
          expiresIn: 3600,
        },
        message: 'Token refreshed successfully',
        code: 'SUCCESS_REFRESH_TOKEN',
      };
      mockAuthService.refreshToken.mockResolvedValue(successResponse);

      const result = await controller.refreshToken(refreshTokenDto);
      expect(result).toEqual(successResponse);
      expect(service.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should throw HttpException on refresh token error', async () => {
      const errorResponse: ApiResponse<null> = {
        status: 'error',
        data: null,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      };
      mockAuthService.refreshToken.mockResolvedValue(errorResponse);

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(
        new HttpException(errorResponse, HttpStatus.UNAUTHORIZED),
      );
      expect(service.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  // 测试 logout 端点
  describe('logout', () => {
    it('should successfully logout', async () => {
      const successResponse: ApiResponse<null> = {
        status: 'success',
        data: null,
        message: 'Logged out successfully',
        code: 'SUCCESS_LOGOUT',
      };
      mockAuthService.logout.mockResolvedValue(successResponse);

      const result = await controller.logout(mockRequest);
      expect(result).toEqual(successResponse);
      expect(service.logout).toHaveBeenCalledWith('mock-token');
    });

    it('should throw HttpException on logout error', async () => {
      const errorResponse: ApiResponse<null> = {
        status: 'error',
        data: null,
        message: 'Invalid or already logged out',
        code: 'INVALID_TOKEN',
      };
      mockAuthService.logout.mockResolvedValue(errorResponse);

      await expect(controller.logout(mockRequest)).rejects.toThrow(
        new HttpException(errorResponse, HttpStatus.UNAUTHORIZED),
      );
      expect(service.logout).toHaveBeenCalledWith('mock-token');
    });
  });
});