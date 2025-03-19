"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
// src/common/common.module.ts
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const ioredis_1 = require("@nestjs-modules/ioredis");
const throttler_1 = require("@nestjs/throttler");
const config_1 = require("@nestjs/config");
const request_id_middleware_1 = require("./middleware/request-id.middleware");
const security_headers_middleware_1 = require("./middleware/security-headers.middleware");
const cors_middleware_1 = require("./middleware/cors.middleware");
const content_type_middleware_1 = require("./middleware/content-type.middleware");
const logging_interceptor_1 = require("./middleware/logging.interceptor");
const error_handling_interceptor_1 = require("./middleware/error-handling.interceptor");
const jwt_guard_1 = require("./middleware/jwt.guard");
const authentication_guard_1 = require("./middleware/authentication.guard");
const rate_limiting_guard_1 = require("./middleware/rate-limiting.guard");
const csrf_guard_1 = require("./middleware/csrf.guard");
const user_entity_1 = require("./entities/user.entity");
const password_reset_entity_1 = require("./entities/password-reset.entity");
const blacklisted_token_entity_1 = require("./entities/blacklisted-token.entity");
let CommonModule = class CommonModule {
    configure(consumer) {
        consumer
            .apply(request_id_middleware_1.RequestIdMiddleware, security_headers_middleware_1.SecurityHeadersMiddleware, cors_middleware_1.CorsMiddleware, content_type_middleware_1.ContentTypeMiddleware)
            .forRoutes('*');
    }
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule, // 确保 ConfigService 可用
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, password_reset_entity_1.PasswordReset, blacklisted_token_entity_1.BlacklistedToken]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                }),
                inject: [config_1.ConfigService],
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'single',
                    options: {
                        host: configService.get('cache.host', 'localhost'),
                        port: configService.get('cache.port', 6379),
                        password: configService.get('cache.password') || undefined,
                        db: configService.get('cache.db', 0),
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            ttl: configService.get('RATE_LIMIT_TTL', 60000), // 毫秒
                            limit: configService.get('RATE_LIMIT_MAX', 10),
                        },
                    ],
                }),
            }),
        ],
        providers: [
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
            { provide: core_1.APP_INTERCEPTOR, useClass: error_handling_interceptor_1.ErrorHandlingInterceptor },
            { provide: core_1.APP_GUARD, useClass: rate_limiting_guard_1.RateLimitingGuard },
            jwt_guard_1.JwtGuard,
            authentication_guard_1.AuthenticationGuard,
            rate_limiting_guard_1.RateLimitingGuard,
            csrf_guard_1.CsrfGuard,
        ],
        exports: [
            typeorm_1.TypeOrmModule,
            jwt_guard_1.JwtGuard,
            authentication_guard_1.AuthenticationGuard,
            rate_limiting_guard_1.RateLimitingGuard,
            csrf_guard_1.CsrfGuard,
        ],
    })
], CommonModule);
//# sourceMappingURL=common.module.js.map