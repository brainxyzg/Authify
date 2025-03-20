import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ApiResponse } from '../common/models/api-response.dto';
import { SsoCallbackResponseDto, SsoProvider } from './models/sso.dto';

@Injectable()
export class SsoService {
  private readonly providers: Record<
    SsoProvider,
    { clientId: string; clientSecret: string; redirectUri: string }
  >;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LoginMethod)
    private readonly loginMethodRepository: Repository<LoginMethod>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // 替换为 CacheManager
  ) {
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    this.providers = {
      [SsoProvider.GOOGLE]: {
        clientId: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
        clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
        redirectUri: `${baseUrl}/api/v1/sso/google/callback`,
      },
      [SsoProvider.GITHUB]: {
        clientId: this.configService.get<string>('GITHUB_CLIENT_ID', ''),
        clientSecret: this.configService.get<string>('GITHUB_CLIENT_SECRET', ''),
        redirectUri: `${baseUrl}/api/v1/sso/github/callback`,
      },
    };
  }

  async initiateSso(provider: SsoProvider): Promise<string> {
    const providerConfig = this.providers[provider];
    if (!providerConfig || !providerConfig.clientId || !providerConfig.clientSecret) {
      throw new HttpException(
        this.errorResponse('Unsupported or misconfigured provider', 'INVALID_PROVIDER'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const { clientId, redirectUri } = providerConfig;
    const state = randomBytes(16).toString('hex');
    await this.cacheManager.set(`sso:state:${state}`, provider, 600); // 10分钟 TTL

    return this.buildAuthUrl(provider, clientId, redirectUri, state);
  }

  async handleSsoCallback(
    provider: SsoProvider,
    code: string,
    state?: string,
  ): Promise<ApiResponse<SsoCallbackResponseDto>> {
    const providerConfig = this.providers[provider];
    if (!providerConfig || !providerConfig.clientId || !providerConfig.clientSecret) {
      return this.errorResponse('Invalid provider', 'INVALID_PROVIDER');
    }

    if (!state) {
      return this.errorResponse('CSRF state parameter missing', 'MISSING_CSRF_STATE');
    }

    const storedProvider = await this.cacheManager.get(`sso:state:${state}`);
    if (!storedProvider || storedProvider !== provider) {
      return this.errorResponse('Invalid or expired CSRF state', 'INVALID_CSRF_STATE');
    }
    await this.cacheManager.del(`sso:state:${state}`);

    const { clientId, clientSecret, redirectUri } = providerConfig;
    try {
      const tokenResponse =
        provider === SsoProvider.GOOGLE
          ? await this.fetchGoogleToken(clientId, clientSecret, redirectUri, code)
          : await this.fetchGithubToken(clientId, clientSecret, redirectUri, code);

      const userInfo =
        provider === SsoProvider.GOOGLE
          ? await this.fetchGoogleUserInfo(tokenResponse.access_token)
          : await this.fetchGithubUserInfo(tokenResponse.access_token);

      const user = await this.findOrCreateUser(userInfo, provider);
      const accessToken = this.generateAccessToken(user);
      const refreshToken = randomBytes(32).toString('hex');

      await this.loginMethodRepository.save(this.loginMethodRepository.create({ provider, user }));

      return {
        status: 'success',
        data: {
          access_token: accessToken,
          token_type: 'bearer',
          refresh_token: refreshToken,
          expires_in: this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRY_SECONDS', 3600),
          user: { username: user.username, email: user.email },
        },
        message: 'SSO login successful',
        code: 'SUCCESS_SSO_LOGIN',
      };
    } catch (error) {
      return this.errorResponse(
        `SSO login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INVALID_SSO_CODE',
      );
    }
  }

  private buildAuthUrl(
    provider: SsoProvider,
    clientId: string,
    redirectUri: string,
    state: string,
  ): string {
    if (provider === SsoProvider.GOOGLE) {
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&state=${state}`;
    }
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;
  }

  private async findOrCreateUser(userInfo: any, provider: SsoProvider): Promise<User> {
    let user = await this.userRepository.findOne({ where: { email: userInfo.email } });
    if (!user) {
      const username =
        userInfo.username ||
        userInfo.login ||
        `sso_${provider.toLowerCase()}_${randomBytes(4).toString('hex')}`;
      user = this.userRepository.create({
        username,
        email: userInfo.email,
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.userRepository.save(user);
    }
    return user;
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, username: user.username },
      { expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '1h') },
    );
  }

  private async fetchGoogleToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<{ access_token: string }> {
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

  private async fetchGoogleUserInfo(accessToken: string): Promise<{ email: string }> {
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
  ): Promise<{ access_token: string }> {
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

  private async fetchGithubUserInfo(
    accessToken: string,
  ): Promise<{ email: string; login: string }> {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch GitHub user info');
    return response.json();
  }

  private errorResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'error', data: null, message, code };
  }
}
