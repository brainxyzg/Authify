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
exports.CsrfGuard = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const crypto_1 = require("crypto");
let CsrfGuard = class CsrfGuard {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async canActivate(context) {
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
            const newToken = (0, crypto_1.randomBytes)(16).toString('hex');
            await this.redis.setex(`csrf:${newToken}`, 3600, newToken); // 存储 1 小时
            response.cookie('csrf_token', newToken, { httpOnly: true, secure: true });
            throw new common_1.HttpException({ status: 'error', data: null, message: 'CSRF token required', code: 'CSRF_TOKEN_REQUIRED' }, common_1.HttpStatus.FORBIDDEN);
        }
        // 验证 CSRF token
        if (!csrfTokenFromHeader || !csrfTokenFromCookie || csrfTokenFromHeader !== csrfTokenFromCookie) {
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Invalid CSRF token', code: 'INVALID_CSRF_TOKEN' }, common_1.HttpStatus.FORBIDDEN);
        }
        // 检查 Redis 中的 token 是否有效
        const storedToken = await this.redis.get(`csrf:${csrfTokenFromCookie}`);
        if (!storedToken || storedToken !== csrfTokenFromCookie) {
            throw new common_1.HttpException({ status: 'error', data: null, message: 'Expired or invalid CSRF token', code: 'INVALID_CSRF_TOKEN' }, common_1.HttpStatus.FORBIDDEN);
        }
        return true;
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.Redis])
], CsrfGuard);
//# sourceMappingURL=csrf.guard.js.map