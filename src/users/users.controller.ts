import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import {
  UpdateUserInfoDto,
  ChangePasswordDto,
  VerifyEmailDto,
  UserInfoResponseDto,
  UpdateUserInfoResponseDto,
  VerifyEmailResponseDto,
} from './models/users.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDoc,
  ApiBearerAuth,
} from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: { sub: number; username: string }; // 根据你的 JWT payload 调整
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponseDoc({ status: 200, description: 'User info retrieved', type: ApiResponse })
  @ApiResponseDoc({ status: 401, description: 'Unauthorized', type: ApiResponse })
  async getCurrentUser(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<UserInfoResponseDto>> {
    const result = await this.usersService.getCurrentUser(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.NOT_FOUND,
      );
    }
    return result as ApiResponse<UserInfoResponseDto>;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 5 } }) // 5 次/小时
  @ApiOperation({ summary: 'Update current user info' })
  @ApiResponseDoc({ status: 200, description: 'User info updated', type: ApiResponse })
  @ApiResponseDoc({
    status: 400,
    description: 'Bad request (e.g., username taken)',
    type: ApiResponse,
  })
  async updateUserInfo(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateUserInfoDto,
  ): Promise<ApiResponse<UpdateUserInfoResponseDto>> {
    const result = await this.usersService.updateUserInfo(req.user.sub, updateDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<UpdateUserInfoResponseDto>;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 5 } }) // 5 次/小时
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponseDoc({ status: 200, description: 'Password updated', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: 'Incorrect old password', type: ApiResponse })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse<null>> {
    const result = await this.usersService.changePassword(req.user.sub, changePasswordDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        result.code === 'INCORRECT_PASSWORD' ? HttpStatus.BAD_REQUEST : HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  @Post('me/verify-email/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 24 * 60 * 60 * 1000, limit: 3 } }) // 3 次/天
  @ApiOperation({ summary: 'Send email verification code' })
  @ApiResponseDoc({ status: 200, description: 'Verification email sent', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: 'Email already verified', type: ApiResponse })
  async sendVerifyEmail(@Req() req: AuthenticatedRequest): Promise<ApiResponse<null>> {
    const result = await this.usersService.sendVerifyEmail(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Patch('me/verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 10 } }) // 10 次/小时
  @ApiOperation({ summary: 'Verify email with code' })
  @ApiResponseDoc({ status: 200, description: 'Email verified', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: 'Invalid code', type: ApiResponse })
  async verifyEmail(
    @Req() req: AuthenticatedRequest,
    @Body() verifyDto: VerifyEmailDto,
  ): Promise<ApiResponse<VerifyEmailResponseDto>> {
    const result = await this.usersService.verifyEmail(req.user.sub, verifyDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<VerifyEmailResponseDto>;
  }
}
