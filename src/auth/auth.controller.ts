import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './models/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './models/refresh-token.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { Throttle } from '@nestjs/throttler'; // 使用内置 Throttle 装饰器

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } }) // 5 次/15分钟（单位：毫秒）
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    const result = await this.authService.login(loginDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: 'error', message: result.message },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return result as ApiResponse<LoginResponseDto>; // 类型断言确保返回正确类型
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 20 } }) // 20 次/小时（单位：毫秒）
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponse<RefreshTokenResponseDto>> {
    const result = await this.authService.refreshToken(refreshTokenDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: 'error', message: result.message },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return result as ApiResponse<RefreshTokenResponseDto>;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async logout(@Request() req): Promise<ApiResponse<null>> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpException(
        { status: 'error', message: 'Token is required' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const result = await this.authService.logout(token);
    if (result.status === 'error') {
      throw new HttpException(
        { status: 'error', message: result.message },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return result;
  }
}
