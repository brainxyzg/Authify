import { Controller, Get, Patch, Post, Body, HttpCode, HttpStatus, HttpException, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserInfoDto, ChangePasswordDto, VerifyEmailDto } from './models/users.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { Throttle } from '../common/decorators/throttle.decorator';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Req() req): Promise<ApiResponse<any>> {
    const result = await this.usersService.getCurrentUser(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Throttle(60 * 60, 5) // 5 次/小时
  @UseGuards(RateLimitingGuard)
  async updateUserInfo(@Req() req, @Body() updateDto: UpdateUserInfoDto): Promise<ApiResponse<any>> {
    const result = await this.usersService.updateUserInfo(req.user.sub, updateDto);
    if (result.status === 'error') {
      throw new HttpException(result, result.data ? HttpStatus.BAD_REQUEST : HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @Throttle(60 * 60, 5) // 5 次/小时
  @UseGuards(RateLimitingGuard)
  async changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto): Promise<ApiResponse<any>> {
    const result = await this.usersService.changePassword(req.user.sub, changePasswordDto);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('me/verify-email/send')
  @HttpCode(HttpStatus.OK)
  @Throttle(24 * 60 * 60, 3) // 3 次/天
  @UseGuards(RateLimitingGuard)
  async sendVerifyEmail(@Req() req): Promise<ApiResponse<any>> {
    const result = await this.usersService.sendVerifyEmail(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Patch('me/verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle(60 * 60, 10) // 10 次/小时
  @UseGuards(RateLimitingGuard)
  async verifyEmail(@Req() req, @Body() verifyDto: VerifyEmailDto): Promise<ApiResponse<any>> {
    const result = await this.usersService.verifyEmail(req.user.sub, verifyDto);
    if (result.status === 'error') {
      throw new HttpException(result, result.data ? HttpStatus.BAD_REQUEST : HttpStatus.UNAUTHORIZED);
    }
    return result;
  }
}