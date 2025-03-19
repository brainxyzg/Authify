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
import { RedisService } from '../common/services/redis.service'; // 假设已实现 Redis 服务
import { TwoFactorService } from '../two-factor/twofactor.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private twoFactorService: TwoFactorService,
  ) {}

  async login(loginDto: LoginDto): Promise<ApiResponse<LoginResponseDto | null>> {
    const user = await this.userRepository.findOne({ where: { username: loginDto.username } });
    if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      return {
        status: 'error',
        data: null,
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // 修复：显式处理 null 情况
    const userWith2FA = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['twoFactorSetting'],
    });
    const twoFactorSetting = userWith2FA?.twoFactorSetting || null; // 安全获取 twoFactorSetting

    if (twoFactorSetting?.isEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          status: 'error',
          data: null,
          message: 'Two-factor code required',
          code: '2FA_REQUIRED',
        };
      }
      const isValid = await this.twoFactorService.validate2FACode(user.id, loginDto.twoFactorCode);
      if (!isValid) {
        return {
          status: 'error',
          data: null,
          message: 'Invalid 2FA code',
          code: 'INVALID_2FA_CODE',
        };
      }
    }

    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
    });

    // 保存刷新令牌到数据库
    await this.refreshTokenRepository.save({
      user,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
    });

    return {
      status: 'success',
      data: {
        accessToken: accessToken,
        tokenType: 'bearer',
        refreshToken: refreshToken,
        expiresIn: 3600,
      },
      message: 'Login successful',
      code: 'SUCCESS_LOGIN',
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponse<RefreshTokenResponseDto | null>> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash: refreshTokenDto.refreshToken },
      relations: ['user'],
    });

    if (
      !token ||
      token.expiresAt < new Date() ||
      (await this.redisService.get(`blacklist:${token.tokenHash}`))
    ) {
      return {
        status: 'error',
        data: null,
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      };
    }

    const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
    const newAccessToken = this.jwtService.sign(
      { sub: payload.sub, username: payload.username },
      {
        expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
      },
    );
    const newRefreshToken = this.jwtService.sign(
      { sub: payload.sub, username: payload.username },
      {
        expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
      },
    );

    // 更新刷新令牌
    token.tokenHash = newRefreshToken;
    token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.save(token);

    // 将旧刷新令牌加入黑名单
    await this.redisService.set(
      `blacklist:${refreshTokenDto.refreshToken}`,
      'true',
      7 * 24 * 60 * 60,
    );

    return {
      status: 'success',
      data: {
        accessToken: newAccessToken,
        tokenType: 'bearer',
        expiresIn: 3600,
      },
      message: 'Token refreshed successfully',
      code: 'SUCCESS_REFRESH_TOKEN',
    };
  }

  async logout(token: string): Promise<ApiResponse<null>> {
    const decoded = this.jwtService.verify(token);
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { user: { id: decoded.sub } },
    });

    if (!refreshToken || (await this.redisService.get(`blacklist:${token}`))) {
      return {
        status: 'error',
        data: null,
        message: 'Invalid or already logged out',
        code: 'INVALID_TOKEN',
      };
    }

    // 将访问令牌和刷新令牌加入黑名单
    await this.redisService.set(`blacklist:${token}`, 'true', 3600); // 访问令牌 1 小时
    await this.redisService.set(`blacklist:${refreshToken.tokenHash}`, 'true', 7 * 24 * 60 * 60); // 刷新令牌 7 天
    await this.refreshTokenRepository.delete({ tokenHash: refreshToken.tokenHash });

    return {
      status: 'success',
      data: null,
      message: 'Logged out successfully',
      code: 'SUCCESS_LOGOUT',
    };
  }
}
