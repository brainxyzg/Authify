import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TwoFactorService } from './twofactor.service';
import { Verify2FADto } from './models/twofactor.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { Throttle } from '../common/decorators/throttle.decorator';

@Controller('2fa')
@UseGuards(JwtGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @Throttle(24 * 60 * 60, 3) // 3 次/天
  @UseGuards(RateLimitingGuard)
  async enable2FA(@Req() req): Promise<ApiResponse<any>> {
    const result = await this.twoFactorService.enable2FA(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle(60 * 60, 10) // 10 次/小时
  @UseGuards(RateLimitingGuard)
  async verify2FA(@Req() req, @Body() verifyDto: Verify2FADto): Promise<ApiResponse<any>> {
    const result = await this.twoFactorService.verify2FA(req.user.sub, verifyDto);
    if (result.status === 'error') {
      throw new HttpException(
        result,
        result.data ? HttpStatus.BAD_REQUEST : HttpStatus.UNAUTHORIZED,
      );
    }
    return result;
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @Throttle(24 * 60 * 60, 3) // 3 次/天
  @UseGuards(RateLimitingGuard)
  async disable2FA(@Req() req): Promise<ApiResponse<any>> {
    const result = await this.twoFactorService.disable2FA(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Post('backup-codes/generate')
  @HttpCode(HttpStatus.OK)
  @Throttle(24 * 60 * 60, 3) // 3 次/天
  @UseGuards(RateLimitingGuard)
  async generateBackupCodes(@Req() req): Promise<ApiResponse<any>> {
    const result = await this.twoFactorService.generateBackupCodes(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }
}
