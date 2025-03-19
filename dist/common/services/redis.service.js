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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = class RedisService {
    configService;
    client;
    constructor(configService) {
        this.configService = configService;
        this.client = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            password: this.configService.get('REDIS_PASSWORD'), // 可选
            db: this.configService.get('REDIS_DB', 0), // 默认数据库
        });
    }
    // 在模块初始化时连接 Redis
    async onModuleInit() {
        try {
            await this.client.ping();
            console.log('Redis connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw new Error('Redis connection failed');
        }
    }
    async health() {
        try {
            const response = await this.client.ping();
            if (response === 'PONG') {
                return { status: 'ok' };
            }
            else {
                return { status: 'error', message: 'Unexpected PING response' };
            }
        }
        catch (error) {
            return { status: 'error', message: `Redis ping failed: ${error.message}` };
        }
    }
    // 在模块销毁时断开连接
    async onModuleDestroy() {
        await this.client.quit();
        console.log('Redis connection closed');
    }
    // 设置键值对（带过期时间）
    async set(key, value, ttl) {
        if (ttl) {
            await this.client.setex(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    // 获取键值
    async get(key) {
        return await this.client.get(key);
    }
    // 删除键
    async del(key) {
        await this.client.del(key);
    }
    // 检查键是否存在
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    // 增加计数器（用于速率限制）
    async increment(key, ttl) {
        const count = await this.client.incr(key);
        if (ttl && count === 1) {
            await this.client.expire(key, ttl); // 首次设置 TTL
        }
        return count;
    }
    // 获取剩余 TTL
    async ttl(key) {
        return await this.client.ttl(key);
    }
    // 清空数据库（谨慎使用，仅用于测试）
    async flushAll() {
        await this.client.flushall();
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map