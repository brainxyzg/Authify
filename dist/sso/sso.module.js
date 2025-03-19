"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsoModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sso_controller_1 = require("./sso.controller");
const sso_service_1 = require("./sso.service");
const user_entity_1 = require("../common/entities/user.entity");
const login_method_entity_1 = require("../common/entities/login-method.entity");
const jwt_1 = require("@nestjs/jwt");
const redis_service_1 = require("../common/services/redis.service");
const config_1 = require("@nestjs/config");
const jwt_guard_1 = require("../common/middleware/jwt.guard");
let SsoModule = class SsoModule {
};
exports.SsoModule = SsoModule;
exports.SsoModule = SsoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, login_method_entity_1.LoginMethod]),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'secretKey',
                signOptions: { expiresIn: '1h' },
            }),
        ],
        controllers: [sso_controller_1.SsoController],
        providers: [sso_service_1.SsoService, redis_service_1.RedisService, jwt_guard_1.JwtGuard],
    })
], SsoModule);
//# sourceMappingURL=sso.module.js.map