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
exports.SsoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../common/entities/user.entity");
const login_method_entity_1 = require("../common/entities/login-method.entity");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../common/services/redis.service"); // 引入 RedisService
const sso_dto_1 = require("./models/sso.dto");
const crypto_1 = require("crypto");
let SsoService = class SsoService {
    userRepository;
    loginMethodRepository;
    jwtService;
    configService;
    redisService;
    providers;
    constructor(userRepository, loginMethodRepository, jwtService, configService, redisService) {
        this.userRepository = userRepository;
        this.loginMethodRepository = loginMethodRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.redisService = redisService;
        this.providers = {
            [sso_dto_1.SsoProvider.GOOGLE]: {
                clientId: this.configService.get('GOOGLE_CLIENT_ID'),
                clientSecret: this.configService.get('GOOGLE_CLIENT_SECRET'),
                redirectUri: `${this.configService.get('BASE_URL')}/api/v1/sso/google/callback`,
            },
            [sso_dto_1.SsoProvider.GITHUB]: {
                clientId: this.configService.get('GITHUB_CLIENT_ID'),
                clientSecret: this.configService.get('GITHUB_CLIENT_SECRET'),
                redirectUri: `${this.configService.get('BASE_URL')}/api/v1/sso/github/callback`,
            },
        };
    }
    async initiateSso(provider) {
        if (!this.providers[provider]) {
            throw new common_1.HttpException({ status: 'error', data: { field: 'provider', reason: 'Unsupported provider' }, message: 'Invalid provider', code: 'INVALID_PROVIDER' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { clientId, redirectUri } = this.providers[provider];
        const state = (0, crypto_1.randomBytes)(16).toString('hex'); // CSRF 防护
        // 将 state 存储到 Redis，设置 10 分钟 TTL
        await this.redisService.set(`sso:state:${state}`, provider, 600);
        let authUrl;
        if (provider === sso_dto_1.SsoProvider.GOOGLE) {
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&state=${state}`;
        }
        else if (provider === sso_dto_1.SsoProvider.GITHUB) {
            authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;
        }
        return authUrl;
    }
    async handleSsoCallback(provider, code, state) {
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
        let tokenResponse;
        let userInfo;
        try {
            if (provider === sso_dto_1.SsoProvider.GOOGLE) {
                tokenResponse = await this.fetchGoogleToken(clientId, clientSecret, redirectUri, code);
                userInfo = await this.fetchGoogleUserInfo(tokenResponse.access_token);
            }
            else if (provider === sso_dto_1.SsoProvider.GITHUB) {
                tokenResponse = await this.fetchGithubToken(clientId, clientSecret, redirectUri, code);
                userInfo = await this.fetchGithubUserInfo(tokenResponse.access_token);
            }
        }
        catch (error) {
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
                username: userInfo.username || userInfo.login || `sso_${(0, crypto_1.randomBytes)(4).toString('hex')}`,
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
        const refreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
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
    async fetchGoogleToken(clientId, clientSecret, redirectUri, code) {
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
        if (!response.ok)
            throw new Error('Failed to fetch Google token');
        return response.json();
    }
    async fetchGoogleUserInfo(accessToken) {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok)
            throw new Error('Failed to fetch Google user info');
        return response.json();
    }
    async fetchGithubToken(clientId, clientSecret, redirectUri, code) {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
        });
        if (!response.ok)
            throw new Error('Failed to fetch GitHub token');
        return response.json();
    }
    async fetchGithubUserInfo(accessToken) {
        const response = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok)
            throw new Error('Failed to fetch GitHub user info');
        return response.json();
    }
};
exports.SsoService = SsoService;
exports.SsoService = SsoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(login_method_entity_1.LoginMethod)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService])
], SsoService);
//# sourceMappingURL=sso.service.js.map