import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { LoginDto, LoginResponseDto } from './models/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './models/refresh-token.dto';
import { ApiResponse } from '../common/models/api-response.dto';
import { RedisService } from '../redis/redis.service';
import { TwoFactorService } from '../two-factor/twofactor.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async login(loginDto: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['twoFactorSetting'],
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      return this.errorResponse('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    if (user.twoFactorSetting?.isEnabled) {
      if (!loginDto.twoFactorCode) {
        return this.errorResponse('Two-factor code required', '2FA_REQUIRED');
      }
      const isValid = await this.twoFactorService.validate2FACode(user.id, loginDto.twoFactorCode);
      if (!isValid) {
        return this.errorResponse('Invalid 2FA code', 'INVALID_2FA_CODE');
      }
    }

    const payload = { sub: user.id, username: user.username };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    await this.refreshTokenRepository.save({
      user,
      tokenHash: refreshToken, // 存储 token 而不是 hash
      expiresAt: new Date(Date.now() + this.getRefreshTokenExpiryMs()),
    });

    return {
      status: 'success',
      data: {
        accessToken,
        tokenType: 'bearer',
        refreshToken,
        expiresIn: this.getAccessTokenExpirySeconds(),
      },
      message: 'Login successful',
      code: 'SUCCESS_LOGIN',
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponse<RefreshTokenResponseDto>> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash: refreshTokenDto.refreshToken },
      relations: ['user'],
    });

    if (!token || token.expiresAt < new Date()) {
      return this.errorResponse('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const isBlacklisted = await this.redisService.get(`blacklist:${token.tokenHash}`);
    if (isBlacklisted) {
      return this.errorResponse('Refresh token has been revoked', 'REVOKED_REFRESH_TOKEN');
    }

    let payload;
    try {
      payload = this.jwtService.verify(refreshTokenDto.refreshToken);
    } catch (e) {
      return this.errorResponse('Invalid refresh token signature', 'INVALID_REFRESH_TOKEN');
    }

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(payload);

    // 更新刷新令牌
    await this.refreshTokenRepository.update(
      { tokenHash: token.tokenHash },
      {
        tokenHash: newRefreshToken,
        expiresAt: new Date(Date.now() + this.getRefreshTokenExpiryMs()),
      },
    );

    // 将旧刷新令牌加入黑名单
    await this.redisService.set(
      `blacklist:${refreshTokenDto.refreshToken}`,
      'true',
      this.getRefreshTokenExpirySeconds(),
    );

    return {
      status: 'success',
      data: {
        accessToken: newAccessToken,
        tokenType: 'bearer',
        expiresIn: this.getAccessTokenExpirySeconds(),
      },
      message: 'Token refreshed successfully',
      code: 'SUCCESS_REFRESH_TOKEN',
    };
  }

  async logout(token: string): Promise<ApiResponse<null>> {
    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch (e) {
      return this.errorResponse('Invalid token', 'INVALID_TOKEN');
    }

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { user: { id: payload.sub } },
    });

    if (!refreshToken) {
      return this.errorResponse('No active session found', 'NO_ACTIVE_SESSION');
    }

    const isBlacklisted = await this.redisService.get(`blacklist:${refreshToken.tokenHash}`);
    if (isBlacklisted) {
      return this.errorResponse('Already logged out', 'ALREADY_LOGGED_OUT');
    }

    // 将访问令牌和刷新令牌加入黑名单
    await Promise.all([
      this.redisService.set(`blacklist:${token}`, 'true', this.getAccessTokenExpirySeconds()),
      this.redisService.set(
        `blacklist:${refreshToken.tokenHash}`,
        'true',
        this.getRefreshTokenExpirySeconds(),
      ),
      this.refreshTokenRepository.delete({ tokenHash: refreshToken.tokenHash }),
    ]);

    return {
      status: 'success',
      data: null,
      message: 'Logged out successfully',
      code: 'SUCCESS_LOGOUT',
    };
  }

  // 辅助方法
  private generateAccessToken(payload: { sub: number; username: string }): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
    });
  }

  private generateRefreshToken(payload: { sub: number; username: string }): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
    });
  }

  private getAccessTokenExpirySeconds(): number {
    return this.parseExpiryToSeconds(
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
    );
  }

  private getRefreshTokenExpirySeconds(): number {
    return this.parseExpiryToSeconds(
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
    );
  }

  private getRefreshTokenExpiryMs(): number {
    return this.getRefreshTokenExpirySeconds() * 1000;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return value; // 假设无单位时为秒
    }
  }

  private errorResponse(message: string, code: string): ApiResponse<null> {
    return { status: 'error', data: null, message, code };
  }
}
