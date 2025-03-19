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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../common/entities/user.entity");
const redis_service_1 = require("../common/services/redis.service");
const common_2 = require("@nestjs/common");
let HealthService = HealthService_1 = class HealthService {
    userRepository;
    redisService;
    logger = new common_2.Logger(HealthService_1.name);
    constructor(userRepository, redisService) {
        this.userRepository = userRepository;
        this.redisService = redisService;
    }
    async checkHealth() {
        const health = {
            overall: 'healthy',
            database: 'ok',
            cache: 'ok',
        };
        // 检查数据库连接
        try {
            await this.userRepository.query('SELECT 1');
        }
        catch (error) {
            this.logger.error(`Database health check failed: ${error.message}`);
            health.database = 'error';
            health.overall = 'unhealthy';
            return {
                status: 'error',
                data: { component: 'database', reason: 'Connection failed' },
                message: 'Service unavailable',
                code: 'SERVICE_UNAVAILABLE',
            };
        }
        // 检查 Redis 连接
        try {
            const redisHealth = await this.redisService.health();
            if (redisHealth.status !== 'ok') {
                throw new Error(redisHealth.message || 'Redis health check failed');
            }
        }
        catch (error) {
            this.logger.error(`Redis health check failed: ${error.message}`);
            health.cache = 'error';
            health.overall = 'unhealthy';
            return {
                status: 'error',
                data: { component: 'cache', reason: 'Connection failed' },
                message: 'Service unavailable',
                code: 'SERVICE_UNAVAILABLE',
            };
        }
        return {
            status: 'success',
            data: health,
            message: 'Service is operational',
            code: 'SUCCESS_HEALTH_CHECK',
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        redis_service_1.RedisService])
], HealthService);
//# sourceMappingURL=health.service.js.map