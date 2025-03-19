"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../common/entities/user.entity");
const refresh_token_entity_1 = require("../common/entities/refresh-token.entity");
const redis_service_1 = require("../common/services/redis.service"); // 假设已实现 Redis 服务
const twofactor_service_1 = require("../two-factor/twofactor.service");
let AuthService = class AuthService {
    userRepository;
    refreshTokenRepository;
    jwtService;
    configService;
    redisService;
    twoFactorService;
    constructor(userRepository, refreshTokenRepository, jwtService, configService, redisService, twoFactorService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.redisService = redisService;
        this.twoFactorService = twoFactorService;
    }
    async login(loginDto) {
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
    async refreshToken(refreshTokenDto) {
        const token = await this.refreshTokenRepository.findOne({
            where: { tokenHash: refreshTokenDto.refreshToken },
            relations: ['user'],
        });
        if (!token || token.expiresAt < new Date() || await this.redisService.get(`blacklist:${token.tokenHash}`)) {
            return {
                status: 'error',
                data: null,
                message: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN',
            };
        }
        const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
        const newAccessToken = this.jwtService.sign({ sub: payload.sub, username: payload.username }, {
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
        });
        const newRefreshToken = this.jwtService.sign({ sub: payload.sub, username: payload.username }, {
            expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
        });
        // 更新刷新令牌
        token.tokenHash = newRefreshToken;
        token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.refreshTokenRepository.save(token);
        // 将旧刷新令牌加入黑名单
        await this.redisService.set(`blacklist:${refreshTokenDto.refreshToken}`, 'true', 7 * 24 * 60 * 60);
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
    async logout(token) {
        const decoded = this.jwtService.verify(token);
        const refreshToken = await this.refreshTokenRepository.findOne({ where: { user: { id: decoded.sub } } });
        if (!refreshToken || await this.redisService.get(`blacklist:${token}`)) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        twofactor_service_1.TwoFactorService])
], AuthService);
//# sourceMappingURL=auth.service.js.map