"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const health_controller_1 = require("./health.controller");
const health_service_1 = require("./health.service");
const user_entity_1 = require("../common/entities/user.entity");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../common/services/redis.service");
let HealthModule = class HealthModule {
};
exports.HealthModule = HealthModule;
exports.HealthModule = HealthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(), // 确保环境变量可用
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]), // 用于数据库健康检查
        ],
        controllers: [health_controller_1.HealthController],
        providers: [health_service_1.HealthService, redis_service_1.RedisService],
    })
], HealthModule);
//# sourceMappingURL=health.module.js.map