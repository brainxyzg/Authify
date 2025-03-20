import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginDto, LoginResponseDto } from './models/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './models/refresh-token.dto';
import { ApiResponse } from '../common/models/api-response.dto';

// Mock AuthService
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

// Mock Request 对象
const mockRequest = {
  headers: {
    authorization: 'Bearer mockToken',
  },
};

describe('AuthController', () => {
  let controller: AuthController;

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
      .overrideGuard(JwtGuard) // 跳过 JwtGuard 的验证
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginDto: LoginDto = { username: 'testuser', password: 'password123' };
      const response: ApiResponse<LoginResponseDto> = {
        status: 'success',
        data: {
          tokenType: 'bearer',
          accessToken: 'accessToken',
          refreshToken: 'refreshToken',
          expiresIn: 3600,
        },
        message: 'Login successful',
        code: 'SUCCESS',
      };
      mockAuthService.login.mockResolvedValue(response);

      const result = await controller.login(loginDto);
      expect(result).toEqual(response);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw HttpException on login failure', async () => {
      const loginDto: LoginDto = { username: 'testuser', password: 'wrongpass' };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      };
      mockAuthService.login.mockResolvedValue(errorResponse);

      await expect(controller.login(loginDto)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Invalid credentials' },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'refreshToken' };
      const response: ApiResponse<RefreshTokenResponseDto> = {
        status: 'success',
        data: {
          accessToken: 'newAccessToken',
          expiresIn: 3600,
          tokenType: 'bearer',
        },
        message: 'Token refreshed',
        code: 'SUCCESS',
      };
      mockAuthService.refreshToken.mockResolvedValue(response);

      const result = await controller.refreshToken(refreshTokenDto);
      expect(result).toEqual(response);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should throw HttpException on refresh failure', async () => {
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'invalidToken' };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      };
      mockAuthService.refreshToken.mockResolvedValue(errorResponse);

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Invalid refresh token' },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const response: ApiResponse<null> = {
        status: 'success',
        data: null,
        message: 'Logout successful',
        code: 'SUCCESS',
      };
      mockAuthService.logout.mockResolvedValue(response);

      const result = await controller.logout(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockAuthService.logout).toHaveBeenCalledWith('mockToken');
    });

    it('should throw HttpException if token is missing', async () => {
      const invalidRequest = { headers: {} }; // 没有 authorization 头

      await expect(controller.logout(invalidRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Token is required' },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw HttpException on logout failure', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Logout failed',
        code: 'LOGOUT_FAILED',
      };
      mockAuthService.logout.mockResolvedValue(errorResponse);

      await expect(controller.logout(mockRequest as any)).rejects.toThrow(
        new HttpException({ status: 'error', message: 'Logout failed' }, HttpStatus.UNAUTHORIZED),
      );
    });
  });
});
