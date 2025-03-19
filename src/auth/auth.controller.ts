import { Controller, Post, Body, HttpCode, HttpStatus, HttpException, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './models/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './models/refresh-token.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { Throttle } from '../common/decorators/throttle.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(15 * 60, 5) // 5 次/15分钟
  @UseGuards(RateLimitingGuard)
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<LoginResponseDto | null>> {
    const result = await this.authService.login(loginDto);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(60 * 60, 20) // 20 次/小时
  @UseGuards(RateLimitingGuard)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<ApiResponse<RefreshTokenResponseDto | null>> {
    const result = await this.authService.refreshToken(refreshTokenDto);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async logout(@Req() req): Promise<ApiResponse<null>> {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await this.authService.logout(token);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }
}