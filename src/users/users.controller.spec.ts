import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UpdateUserInfoDto, ChangePasswordDto, VerifyEmailDto } from './models/users.dto';
import { ApiResponse } from '../common/models/api-response.dto';

// Mock UsersService
const mockUsersService = {
  getCurrentUser: jest.fn(),
  updateUserInfo: jest.fn(),
  changePassword: jest.fn(),
  sendVerifyEmail: jest.fn(),
  verifyEmail: jest.fn(),
};

// Mock Request 对象
const mockRequest = {
  user: { sub: 1, username: 'testuser' },
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtGuard) // 跳过 JwtGuard 的验证
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user info on success', async () => {
      const response: ApiResponse<any> = {
        status: 'success',
        data: { id: 1, username: 'testuser' },
        message: '获取用户信息成功',  // 添加必需的 message 属性
        code: 'USER_RETRIEVED'      // 添加必需的 code 属性
      };
      mockUsersService.getCurrentUser.mockResolvedValue(response);

      const result = await controller.getCurrentUser(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockUsersService.getCurrentUser).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException on error', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      };
      mockUsersService.getCurrentUser.mockResolvedValue(errorResponse);

      await expect(controller.getCurrentUser(mockRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'User not found', code: 'USER_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('updateUserInfo', () => {
    it('should update user info successfully', async () => {
      const updateDto: UpdateUserInfoDto = { username: 'newuser' };
      const response: ApiResponse<any> = {
        status: 'success',
        data: { id: 1, username: 'newuser' },
        message: 'User info updated successfully',
        code: 'USER_UPDATED',
      };
      mockUsersService.updateUserInfo.mockResolvedValue(response);

      const result = await controller.updateUserInfo(mockRequest as any, updateDto);
      expect(result).toEqual(response);
      expect(mockUsersService.updateUserInfo).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw HttpException if username is taken', async () => {
      const updateDto: UpdateUserInfoDto = { username: 'takenuser' };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Username already taken',
        code: 'USERNAME_TAKEN',
      };
      mockUsersService.updateUserInfo.mockResolvedValue(errorResponse);

      await expect(controller.updateUserInfo(mockRequest as any, updateDto)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Username already taken', code: 'USERNAME_TAKEN' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto: ChangePasswordDto = {
        old_password: 'oldpass',
        new_password: 'newpass',
      };
      const response: ApiResponse<null> = {
        status: 'success',
        data: null,
        message: 'Password changed successfully',
        code: 'PASSWORD_CHANGED',
      };
      mockUsersService.changePassword.mockResolvedValue(response);

      const result = await controller.changePassword(mockRequest as any, changePasswordDto);
      expect(result).toEqual(response);
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(1, changePasswordDto);
    });

    it('should throw HttpException on incorrect password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        old_password: 'wrongpass',
        new_password: 'newpass',
      };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Incorrect old password',
        code: 'INCORRECT_PASSWORD',
      };
      mockUsersService.changePassword.mockResolvedValue(errorResponse);

      await expect(
        controller.changePassword(mockRequest as any, changePasswordDto),
      ).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Incorrect old password', code: 'INCORRECT_PASSWORD' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('sendVerifyEmail', () => {
    it('should send verification email successfully', async () => {
      const response: ApiResponse<null> = {
        status: 'success',
        data: null,
        message: 'Verification email sent',
        code: 'EMAIL_SENT',
      };
      mockUsersService.sendVerifyEmail.mockResolvedValue(response);

      const result = await controller.sendVerifyEmail(mockRequest as any);
      expect(result).toEqual(response);
      expect(mockUsersService.sendVerifyEmail).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException if email already verified', async () => {
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Email already verified',
        code: 'EMAIL_ALREADY_VERIFIED',
      };
      mockUsersService.sendVerifyEmail.mockResolvedValue(errorResponse);

      await expect(controller.sendVerifyEmail(mockRequest as any)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Email already verified', code: 'EMAIL_ALREADY_VERIFIED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verifyDto: VerifyEmailDto = { code: '123456' };
      const response: ApiResponse<any> = {
        status: 'success',
        data: { emailVerified: true },
        message: 'Email verified successfully',
        code: 'EMAIL_VERIFIED',
      };
      mockUsersService.verifyEmail.mockResolvedValue(response);

      const result = await controller.verifyEmail(mockRequest as any, verifyDto);
      expect(result).toEqual(response);
      expect(mockUsersService.verifyEmail).toHaveBeenCalledWith(1, verifyDto);
    });

    it('should throw HttpException on invalid code', async () => {
      const verifyDto: VerifyEmailDto = { code: 'wrongcode' };
      const errorResponse: ApiResponse<any> = {
        status: 'error',
        message: 'Invalid verification code',
        code: 'INVALID_CODE',
      };
      mockUsersService.verifyEmail.mockResolvedValue(errorResponse);

      await expect(controller.verifyEmail(mockRequest as any, verifyDto)).rejects.toThrow(
        new HttpException(
          { status: 'error', message: 'Invalid verification code', code: 'INVALID_CODE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});
