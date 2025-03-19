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
import { JwtConfig } from '../../config/config.types';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

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
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header',
          code: 'MISSING_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.split(' ')[1];
    const blacklistKey = `auth:blacklist:${token}`;
    const jwtConfig = this.configService.get<JwtConfig>('jwt');

    // 检查 Redis 黑名单
    const isBlacklistedInCache = await this.redis.get(blacklistKey);
    if (isBlacklistedInCache === 'true') {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
          message: 'Token is blacklisted',
          code: 'BLACKLISTED_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 验证 JWT
    let decoded: JwtPayload;
    try {
      decoded = await this.jwtService.verify(token, {
        secret: jwtConfig.secret,
        algorithms: [jwtConfig.algorithm || 'HS256'], // 支持配置的算法
      });
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 检查数据库黑名单
    const blacklistedToken = await this.blacklistedTokenRepository.findOne({
      where: { tokenIdentifier: token },
    });
    if (blacklistedToken) {
      const ttl = this.calculateRemainingTtl(decoded.exp); // 根据 JWT 过期时间设置缓存
      await this.redis.setex(blacklistKey, ttl, 'true');
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
          message: 'Token is blacklisted',
          code: 'BLACKLISTED_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 注入用户上下文
    request.user = decoded;
    return true;
  }

  private calculateRemainingTtl(expiry: number): number {
    const now = Math.floor(Date.now() / 1000); // 当前时间（秒）
    const ttl = expiry - now;
    return ttl > 0 ? ttl : 3600; // 默认 1 小时
  }
}
