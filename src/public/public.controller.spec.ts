import { Test, TestingModule } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { RegisterDto, RegisterResponseDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock PublicService
const mockPublicService = {
  register: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('PublicController', () => {
  let controller: PublicController;
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        {
          provide: PublicService,
          useValue: mockPublicService,
        },
      ],
    })
      .overrideGuard(RateLimitingGuard) // Mock RateLimitingGuard
      .useValue({ canActivate: () => true }) // 默认通过
      .compile();

    controller = module.get<PublicController>(PublicController);
    service = module.get<PublicService>(PublicService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // 清理每次测试后的 mock 数据
  });

  // 测试 register 端点
  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'test',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully register a user', async () => {
      const successResponse: ApiResponse<RegisterResponseDto> = {
        status: 'success',
        data: { id: 1, email: 'test@example.com', username: 'test' },
        message: 'User registered successfully',
        code: 'REGISTER_SUCCESS',
      };
      mockPublicService.register.mockResolvedValue(successResponse);

      const result = await controller.register(registerDto);
      expect(result).toEqual(successResponse);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw HttpException on registration error', async () => {
      const errorResponse: ApiResponse<null> = {
        status: 'error',
        data: null,
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      };
      mockPublicService.register.mockResolvedValue(errorResponse);

      await expect(controller.register(registerDto)).rejects.toThrow(
        new HttpException(errorResponse, HttpStatus.BAD_REQUEST),
      );
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  // 测试 forgotPassword 端点
  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = { email: 'test@example.com' };

    it('should successfully initiate forgot password process', async () => {
      const successResponse: ApiResponse<any> = {
        status: 'success',
        data: null,
        message: 'Password reset email sent',
        code: 'EMAIL_SENT',
      };
      mockPublicService.forgotPassword.mockResolvedValue(successResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);
      expect(result).toEqual(successResponse);
      expect(service.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  // 测试 resetPassword 端点
  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-token',
      newPassword: 'newpassword123',
    };

    it('should successfully reset password', async () => {
      const successResponse: ApiResponse<any> = {
        status: 'success',
        data: null,
        message: 'Password reset successfully',
        code: 'PASSWORD_RESET',
      };
      mockPublicService.resetPassword.mockResolvedValue(successResponse);

      const result = await controller.resetPassword(resetPasswordDto);
      expect(result).toEqual(successResponse);
      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });

    it('should throw HttpException on invalid token', async () => {
      const errorResponse: ApiResponse<null> = {
        status: 'error',
        data: null,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      };
      mockPublicService.resetPassword.mockResolvedValue(errorResponse);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        new HttpException(errorResponse, HttpStatus.UNAUTHORIZED),
      );
      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });
});
