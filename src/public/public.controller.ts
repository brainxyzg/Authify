import { Controller, Post, Body, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { PublicService } from './public.service';
import { RegisterDto, RegisterResponseDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDoc } from '@nestjs/swagger';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60 * 1000, limit: 10 } }) // 10 次/分钟
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponseDoc({ status: 201, description: 'User registered successfully', type: ApiResponse })
  @ApiResponseDoc({
    status: 400,
    description: 'Bad request (e.g., user exists)',
    type: ApiResponse,
  })
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse<RegisterResponseDto>> {
    const result = await this.publicService.register(registerDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<RegisterResponseDto>;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 5 } }) // 5 次/5分钟
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponseDoc({ status: 200, description: 'Password reset email sent', type: ApiResponse })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<null>> {
    return this.publicService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 5 } }) // 5 次/5分钟
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponseDoc({ status: 200, description: 'Password reset successfully', type: ApiResponse })
  @ApiResponseDoc({ status: 401, description: 'Invalid or expired token', type: ApiResponse })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<null>> {
    const result = await this.publicService.resetPassword(resetPasswordDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return result;
  }
}
