import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // 替换为 CacheManager
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;

    // 仅对非只读方法应用 CSRF 检查
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    const csrfTokenFromHeader = request.headers['x-csrf-token'];
    const csrfTokenFromCookie = request.cookies['csrf_token'];

    // 如果用户未认证，生成并设置 CSRF token（适用于首次请求）
    if (!request.user && !csrfTokenFromCookie) {
      const newToken = randomBytes(16).toString('hex');
      await this.cacheManager.set(`csrf:${newToken}`, newToken, 3600); // 存储 1 小时
      response.cookie('csrf_token', newToken, { httpOnly: true, secure: true });
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'CSRF token required',
          code: 'CSRF_TOKEN_REQUIRED',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // 验证 CSRF token
    if (
      !csrfTokenFromHeader ||
      !csrfTokenFromCookie ||
      csrfTokenFromHeader !== csrfTokenFromCookie
    ) {
      throw new HttpException(
        { status: 'error', data: null, message: 'Invalid CSRF token', code: 'INVALID_CSRF_TOKEN' },
        HttpStatus.FORBIDDEN,
      );
    }

    // 检查 Redis 中的 token 是否有效
    const storedToken = await this.cacheManager.get(`csrf:${csrfTokenFromCookie}`);
    if (!storedToken || storedToken !== csrfTokenFromCookie) {
      throw new HttpException(
        {
          status: 'error',
          data: null,
          message: 'Expired or invalid CSRF token',
          code: 'INVALID_CSRF_TOKEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
