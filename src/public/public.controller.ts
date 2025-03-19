import { Controller, Post, Body, HttpCode, HttpStatus, HttpException, UseGuards } from '@nestjs/common';
import { PublicService } from './public.service';
import { RegisterDto } from './models/register.dto';
import { RegisterResponseDto } from './models/register.dto';
import { ForgotPasswordDto } from './models/forgot-password.dto';
import { ResetPasswordDto } from './models/reset-password.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { Throttle } from '../common/decorators/throttle.decorator';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(60, 10)
  @UseGuards(RateLimitingGuard)
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse<RegisterResponseDto | null>> {
    const result = await this.publicService.register(registerDto);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<any>> {
    return this.publicService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<any>> {
    const result = await this.publicService.resetPassword(resetPasswordDto);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }
}