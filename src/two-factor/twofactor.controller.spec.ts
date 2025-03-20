import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Verify2FADto } from './models/twofactor.dto';
import { ApiResponse } from '../common/models/api-response.dto';

// Mock TwoFactorService
const mockTwoFactorService = {
  enable2FA: jest.fn(),
  verify2FA: jest.fn(),
  disable2FA: jest.fn(),
  generateBackupCodes: jest.fn(),
};

// Mock Request 对象
const mockRequest = {
  user: { sub: 1, username: 'testuser' },
};

describe('TwoFactorController', () => {
  let controller: TwoFactorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
      ],
    })
      .overrideGuard(JwtGuard) // 跳过 JwtGuard 的验证
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enable2FA', () => {
    it('should enable 2FA successfully', async () => {
      const response: ApiResponse<any> = {
        status: 'success',
        data: { qrCodeUrl: 'http://example.com/qr' },
        message: '2FA setup initiated',
        code: 'SUCCESS_ENABLE_2FA',
      };
      mockTwoFactorService.enable2FA.mockResolvedValue(response);

      const result = await controller.enable2FA(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockTwoFactorService.enable2FA).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException if 2FA already enabled', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: '2FA already enabled',
        code: '2FA_ALREADY_ENABLED',
      };
      mockTwoFactorService.enable2FA.mockResolvedValue(errorResponse);

      await expect(controller.enable2FA(mockRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: '2FA already enabled', code: '2FA_ALREADY_ENABLED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA successfully', async () => {
      const verifyDto: Verify2FADto = { code: '123456' };
      const response: ApiResponse<any> = {
        status: 'success',
        data: { is2FAEnabled: true },
        message: '2FA activated',
        code: 'SUCCESS_VERIFY_2FA',
      };
      mockTwoFactorService.verify2FA.mockResolvedValue(response);

      const result = await controller.verify2FA(mockRequest as any, verifyDto);
      expect(result).toEqual(response);
      expect(mockTwoFactorService.verify2FA).toHaveBeenCalledWith(1, verifyDto);
    });

    it('should throw HttpException if code is invalid', async () => {
      const verifyDto: Verify2FADto = { code: 'wrongcode' };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Invalid 2FA code',
        code: 'INVALID_2FA_CODE',
      };
      mockTwoFactorService.verify2FA.mockResolvedValue(errorResponse);

      await expect(controller.verify2FA(mockRequest as any, verifyDto)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Invalid 2FA code', code: 'INVALID_2FA_CODE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA successfully', async () => {
      const response: ApiResponse<null> = {
        status: 'success',
        data: null,
        message: '2FA disabled',
        code: 'SUCCESS_DISABLE_2FA',
      };
      mockTwoFactorService.disable2FA.mockResolvedValue(response);

      const result = await controller.disable2FA(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockTwoFactorService.disable2FA).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException if 2FA not enabled', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      };
      mockTwoFactorService.disable2FA.mockResolvedValue(errorResponse);

      await expect(controller.disable2FA(mockRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: '2FA not enabled', code: '2FA_NOT_ENABLED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes successfully', async () => {
      const response: ApiResponse<any> = {
        status: 'success',
        data: { backupCodes: ['code1', 'code2'] },
        message: 'Backup codes generated',
        code: 'SUCCESS_GENERATE_BACKUP_CODES',
      };
      mockTwoFactorService.generateBackupCodes.mockResolvedValue(response);

      const result = await controller.generateBackupCodes(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockTwoFactorService.generateBackupCodes).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException if 2FA not enabled', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: '2FA not enabled',
        code: '2FA_NOT_ENABLED',
      };
      mockTwoFactorService.generateBackupCodes.mockResolvedValue(errorResponse);

      await expect(controller.generateBackupCodes(mockRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: '2FA not enabled', code: '2FA_NOT_ENABLED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});
