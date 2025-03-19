import { Controller, Get, Param, Query, Res, HttpStatus, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { InitiateSsoDto, SsoCallbackDto } from './models/sso.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDoc,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('sso')
@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Get(':provider')
  @Throttle({ default: { ttl: 60 * 1000, limit: 10 } }) // 10 次/分钟
  @Public()
  @ApiOperation({ summary: 'Initiate SSO login' })
  @ApiParam({ name: 'provider', enum: ['google', 'github'], description: 'SSO provider' })
  @ApiResponseDoc({ status: 302, description: 'Redirects to provider auth URL' })
  @ApiResponseDoc({ status: 400, description: 'Invalid provider' })
  async initiateSso(@Param() params: InitiateSsoDto, @Res() res: Response): Promise<void> {
    const authUrl = await this.ssoService.initiateSso(params.provider);
    res.redirect(HttpStatus.FOUND, authUrl);
  }

  @Get(':provider/callback')
  @Throttle({ default: { ttl: 60 * 1000, limit: 10 } }) // 10 次/分钟
  @Public()
  @ApiOperation({ summary: 'Handle SSO callback' })
  @ApiParam({ name: 'provider', enum: ['google', 'github'], description: 'SSO provider' })
  @ApiQuery({ name: 'code', description: 'Authorization code from provider' })
  @ApiQuery({ name: 'state', description: 'CSRF state parameter', required: false })
  @ApiResponseDoc({ status: 200, description: 'SSO login successful', type: ApiResponse })
  @ApiResponseDoc({ status: 400, description: 'Invalid callback parameters', type: ApiResponse })
  async handleSsoCallback(
    @Param() params: InitiateSsoDto,
    @Query() query: SsoCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.ssoService.handleSsoCallback(
      params.provider,
      query.code,
      query.state,
    );
    if (result.status === 'error') {
      throw new HttpException(
        { status: result.status, message: result.message, code: result.code },
        HttpStatus.BAD_REQUEST,
      );
    }
    res.status(HttpStatus.OK).json(result);
  }
}
