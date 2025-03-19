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
exports.RateLimitingGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const core_1 = require("@nestjs/core");
const throttle_decorator_1 = require("../decorators/throttle.decorator");
let RateLimitingGuard = class RateLimitingGuard extends throttler_1.ThrottlerGuard {
    redis;
    throttlerStorage;
    reflector;
    constructor(redis, throttlerStorage, reflector) {
        super({
            throttlers: [
                {
                    ttl: 60000, // 默认 60 秒窗口
                    limit: 10, // 默认 10 次请求
                }
            ]
        }, throttlerStorage, reflector);
        this.redis = redis;
        this.throttlerStorage = throttlerStorage;
        this.reflector = reflector;
    }
    // 创建统一的错误响应
    createRateLimitError() {
        return {
            response: {
                status: 'error',
                data: null,
                message: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            status: common_1.HttpStatus.TOO_MANY_REQUESTS
        };
    }
    getRateLimitConfig(context) {
        // 从方法或类级别读取 Throttle 装饰器的元数据
        const throttleConfig = this.reflector.get(throttle_decorator_1.THROTTLE_METADATA_KEY, context.getHandler()) ||
            this.reflector.get(throttle_decorator_1.THROTTLE_METADATA_KEY, context.getClass());
        // 如果未设置装饰器，使用默认值
        return {
            ttl: throttleConfig?.ttl ?? 60000,
            limit: throttleConfig?.limit ?? 10,
        };
    }
    // 获取请求标识符
    getRequestIdentifier(request) {
        const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
        const userId = request.user?.user_id;
        const key = userId ? `rate:user:${userId}` : `rate:ip:${ip}`;
        return { key, isUser: !!userId };
    }
    async checkAndUpdateRateLimit(key, limit, ttl) {
        try {
            const multi = this.redis.multi();
            multi.get(key);
            multi.incr(key);
            const results = await multi.exec();
            // 检查 results 是否为 null
            if (!results) {
                console.error('Redis multi.exec returned null, possibly a transaction failure');
                return true; // 放行请求，避免因 Redis 失败而阻塞
            }
            // results 已确保非 null，安全访问
            const current = results[0][1] ? parseInt(results[0][1], 10) : 0;
            if (current === 0) {
                await this.redis.expire(key, ttl);
            }
            return current < limit;
        }
        catch (error) {
            console.error('Redis rate limiting error:', error);
            return true; // 放行请求
        }
    }
    async canActivate(context) {
        try {
            // 调用父类的速率限制逻辑
            const throttlerResult = await super.canActivate(context);
            if (!throttlerResult) {
                const error = this.createRateLimitError();
                throw new common_1.HttpException(error.response, error.status);
            }
            // 获取请求对象
            const request = context.switchToHttp().getRequest();
            // 判断是否跳过限流检查
            const skipCheck = this.reflector.get('skip-throttle', context.getHandler());
            if (skipCheck) {
                return true;
            }
            // 获取限流配置
            const { ttl, limit } = this.getRateLimitConfig(context);
            // 获取请求标识符
            const { key, isUser } = this.getRequestIdentifier(request);
            // 检查并更新 Redis 中的计数器
            const withinLimit = await this.checkAndUpdateRateLimit(key, limit, ttl);
            if (!withinLimit) {
                const error = this.createRateLimitError();
                throw new common_1.HttpException(error.response, error.status);
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            // 处理意外错误
            console.error('Rate limiting unexpected error:', error);
            return true; // 允许请求通过，避免因限流功能故障而阻塞服务
        }
    }
};
exports.RateLimitingGuard = RateLimitingGuard;
exports.RateLimitingGuard = RateLimitingGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.Redis, Object, core_1.Reflector])
], RateLimitingGuard);
//# sourceMappingURL=rate-limiting.guard.js.map