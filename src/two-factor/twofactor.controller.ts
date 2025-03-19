import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TwoFactorService } from './twofactor.service';
import {
  Verify2FADto,
  Enable2FAResponseDto,
  Verify2FAResponseDto,
  GenerateBackupCodesResponseDto,
} from './models/twofactor.dto';
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

@ApiTags('2fa')
@ApiBearerAuth() // 需要 JWT 认证
@Controller('2fa')
@UseGuards(JwtGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 24 * 60 * 60 * 1000, limit: 3 } }) // 3 次/天
  @ApiOperation({ summary: 'Enable 2FA for the authenticated user' })
  @ApiResponseDoc({ status: 200, description: '2FA setup initiated', type: ApiResponse })
  @ApiResponseDoc({
    status: 400,
    description: 'Bad request (e.g., already enabled)',
    type: ApiResponse,
  })
  async enable2FA(@Req() req: AuthenticatedRequest): Promise<ApiResponse<Enable2FAResponseDto>> {
    const result = await this.twoFactorService.enable2FA(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<Enable2FAResponseDto>;
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 10 } }) // 10 次/小时
  @ApiOperation({ summary: 'Verify 2FA code to activate' })
  @ApiResponseDoc({ status: 200, description: '2FA activated', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: 'Invalid code', type: ApiResponse })
  async verify2FA(
    @Req() req: AuthenticatedRequest,
    @Body() verifyDto: Verify2FADto,
  ): Promise<ApiResponse<Verify2FAResponseDto>> {
    const result = await this.twoFactorService.verify2FA(req.user.sub, verifyDto);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<Verify2FAResponseDto>;
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 24 * 60 * 60 * 1000, limit: 3 } }) // 3 次/天
  @ApiOperation({ summary: 'Disable 2FA for the authenticated user' })
  @ApiResponseDoc({ status: 200, description: '2FA disabled', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: '2FA not enabled', type: ApiResponse })
  async disable2FA(@Req() req: AuthenticatedRequest): Promise<ApiResponse<null>> {
    const result = await this.twoFactorService.disable2FA(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Post('backup-codes/generate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 24 * 60 * 60 * 1000, limit: 3 } }) // 3 次/天
  @ApiOperation({ summary: 'Generate new 2FA backup codes' })
  @ApiResponseDoc({ status: 200, description: 'Backup codes generated', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: '2FA not enabled', type: ApiResponse })
  async generateBackupCodes(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<GenerateBackupCodesResponseDto>> {
    const result = await this.twoFactorService.generateBackupCodes(req.user.sub);
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    return result as ApiResponse<GenerateBackupCodesResponseDto>;
  }
}
