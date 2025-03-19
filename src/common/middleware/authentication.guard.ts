import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlacklistedToken } from '../entities/blacklisted-token.entity';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'Missing or invalid Authorization header',
          code: 'MISSING_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenIdentifier = authHeader.split(' ')[1];

    // 检查 Redis 黑名单
    const blacklistKey = `auth:blacklist:${tokenIdentifier}`;
    const isBlacklistedInCache = await this.redis.get(blacklistKey);
    if (isBlacklistedInCache) {
      throw new HttpException(
        { status: 'error', data: null, message: 'Token is blacklisted', code: 'BLACKLISTED_TOKEN' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 验证 JWT
    let decoded;
    try {
      decoded = await this.jwtService.verify(tokenIdentifier, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new HttpException(
        { status: 'error', data: null, message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 检查数据库黑名单（缓存未命中时）
    const blacklistedToken = await this.blacklistedTokenRepository.findOne({
      where: { tokenIdentifier },
    });
    if (blacklistedToken) {
      await this.redis.setex(blacklistKey, 3600, 'true'); // 缓存 1 小时
      throw new HttpException(
        { status: 'error', data: null, message: 'Token is blacklisted', code: 'BLACKLISTED_TOKEN' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 注入用户上下文
    request['user'] = decoded;
    return true;
  }
}
