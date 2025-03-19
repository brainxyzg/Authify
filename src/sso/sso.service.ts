import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/services/redis.service'; // 引入 RedisService
import { ApiResponse } from '../common/models/api-response.dto';
import { SsoCallbackResponseDto, SsoProvider } from './models/sso.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SsoService {
  private readonly providers: Record<
    SsoProvider,
    { clientId: string; clientSecret: string; redirectUri: string }
  >;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LoginMethod)
    private loginMethodRepository: Repository<LoginMethod>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.providers = {
      [SsoProvider.GOOGLE]: {
        clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        redirectUri: `${this.configService.get<string>('BASE_URL')}/api/v1/sso/google/callback`,
      },
      [SsoProvider.GITHUB]: {
        clientId: this.configService.get<string>('GITHUB_CLIENT_ID'),
        clientSecret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
        redirectUri: `${this.configService.get<string>('BASE_URL')}/api/v1/sso/github/callback`,
      },
    };
  }

  async initiateSso(provider: SsoProvider): Promise<string> {
    if (!this.providers[provider]) {
      throw new HttpException(
        {
          status: 'error',
          data: { field: 'provider', reason: 'Unsupported provider' },
          message: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { clientId, redirectUri } = this.providers[provider];
    const state = randomBytes(16).toString('hex'); // CSRF 防护

    // 将 state 存储到 Redis，设置 10 分钟 TTL
    await this.redisService.set(`sso:state:${state}`, provider, 600);

    let authUrl: string;
    if (provider === SsoProvider.GOOGLE) {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&state=${state}`;
    } else if (provider === SsoProvider.GITHUB) {
      authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;
    }

    return authUrl;
  }

  async handleSsoCallback(
    provider: SsoProvider,
    code: string,
    state?: string,
  ): Promise<ApiResponse<SsoCallbackResponseDto | null>> {
    if (!this.providers[provider]) {
      return {
        status: 'error',
        data: null,
        message: 'Invalid provider',
        code: 'INVALID_PROVIDER',
      };
    }

    // 验证 state 参数
    if (!state) {
      return {
        status: 'error',
        data: null,
        message: 'CSRF state parameter missing',
        code: 'MISSING_CSRF_STATE',
      };
    }

    const storedProvider = await this.redisService.get(`sso:state:${state}`);
    if (!storedProvider || storedProvider !== provider) {
      return {
        status: 'error',
        data: null,
        message: 'Invalid or expired CSRF state',
        code: 'INVALID_CSRF_STATE',
      };
    }

    // 验证通过后删除 state
    await this.redisService.del(`sso:state:${state}`);

    const { clientId, clientSecret, redirectUri } = this.providers[provider];
    let tokenResponse: any;
    let userInfo: any;

    try {
      if (provider === SsoProvider.GOOGLE) {
        tokenResponse = await this.fetchGoogleToken(clientId, clientSecret, redirectUri, code);
        userInfo = await this.fetchGoogleUserInfo(tokenResponse.access_token);
      } else if (provider === SsoProvider.GITHUB) {
        tokenResponse = await this.fetchGithubToken(clientId, clientSecret, redirectUri, code);
        userInfo = await this.fetchGithubUserInfo(tokenResponse.access_token);
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: 'SSO login failed: ' + error.message,
        code: 'INVALID_SSO_CODE',
      };
    }

    // 查找或创建用户
    let user = await this.userRepository.findOne({ where: { email: userInfo.email } });
    if (!user) {
      user = this.userRepository.create({
        username: userInfo.username || userInfo.login || `sso_${randomBytes(4).toString('hex')}`,
        email: userInfo.email,
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.userRepository.save(user);
    }

    // 记录登录方式，包含 providerId
    const loginMethod = this.loginMethodRepository.create({
      provider,
      user,
    });
    await this.loginMethodRepository.save(loginMethod);

    // 生成令牌
    const accessToken = this.jwtService.sign({ sub: user.id });
    const refreshToken = randomBytes(32).toString('hex');

    return {
      status: 'success',
      data: {
        access_token: accessToken,
        token_type: 'bearer',
        refresh_token: refreshToken,
        expires_in: 3600,
        user: { username: user.username, email: user.email },
      },
      message: 'SSO login successful',
      code: 'SUCCESS_SSO_LOGIN',
    };
  }

  private async fetchGoogleToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!response.ok) throw new Error('Failed to fetch Google token');
    return response.json();
  }

  private async fetchGoogleUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch Google user info');
    return response.json();
  }

  private async fetchGithubToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<any> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!response.ok) throw new Error('Failed to fetch GitHub token');
    return response.json();
  }

  private async fetchGithubUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch GitHub user info');
    return response.json();
  }
}
