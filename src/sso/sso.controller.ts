import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { SsoService } from './sso.service';
import { InitiateSsoDto, SsoCallbackDto } from './models/sso.dto';
import { Response } from 'express';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { Throttle } from '../common/decorators/throttle.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Get(':provider')
  @Throttle(60, 10) // 10 次/分钟
  @Public() // 无需认证
  @UseGuards(RateLimitingGuard)
  async initiateSso(@Param() params: InitiateSsoDto, @Res() res: Response): Promise<void> {
    const authUrl = await this.ssoService.initiateSso(params.provider);
    res.redirect(HttpStatus.FOUND, authUrl);
  }

  @Get(':provider/callback')
  @Throttle(60, 10) // 10 次/分钟
  @UseGuards(RateLimitingGuard)
  @Public() // 无需认证
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
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    res.status(HttpStatus.OK).json(result);
  }
}
