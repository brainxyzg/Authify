"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationGuard = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const blacklisted_token_entity_1 = require("../entities/blacklisted-token.entity");
let AuthenticationGuard = class AuthenticationGuard {
    redis;
    jwtService;
    configService;
    blacklistedTokenRepository;
    constructor(redis, jwtService, configService, blacklistedTokenRepository) {
        this.redis = redis;
        this.jwtService = jwtService;
        this.configService = configService;
        this.blacklistedTokenRepository = blacklistedTokenRepository;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Missing or invalid Authorization header', code: 'MISSING_TOKEN' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const tokenIdentifier = authHeader.split(' ')[1];
        // 检查 Redis 黑名单
        const blacklistKey = `auth:blacklist:${tokenIdentifier}`;
        const isBlacklistedInCache = await this.redis.get(blacklistKey);
        if (isBlacklistedInCache) {
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Token is blacklisted', code: 'BLACKLISTED_TOKEN' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        // 验证 JWT
        let decoded;
        try {
            decoded = await this.jwtService.verify(tokenIdentifier, {
                secret: this.configService.get('JWT_SECRET'),
            });
        }
        catch (error) {
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Invalid or expired token', code: 'INVALID_TOKEN' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        // 检查数据库黑名单（缓存未命中时）
        const blacklistedToken = await this.blacklistedTokenRepository.findOne({ where: { tokenIdentifier } });
        if (blacklistedToken) {
            await this.redis.setex(blacklistKey, 3600, 'true'); // 缓存 1 小时
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Token is blacklisted', code: 'BLACKLISTED_TOKEN' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        // 注入用户上下文
        request['user'] = decoded;
        return true;
    }
};
exports.AuthenticationGuard = AuthenticationGuard;
exports.AuthenticationGuard = AuthenticationGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __param(3, (0, typeorm_1.InjectRepository)(blacklisted_token_entity_1.BlacklistedToken)),
    __metadata("design:paramtypes", [ioredis_2.Redis,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], AuthenticationGuard);
//# sourceMappingURL=authentication.guard.js.map