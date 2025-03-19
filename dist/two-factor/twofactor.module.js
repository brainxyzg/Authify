"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const twofactor_controller_1 = require("./twofactor.controller");
const twofactor_service_1 = require("./twofactor.service");
const user_entity_1 = require("../common/entities/user.entity");
const two_factor_setting_entity_1 = require("../common/entities/two-factor-setting.entity");
const two_factor_backup_code_entity_1 = require("../common/entities/two-factor-backup-code.entity");
const jwt_guard_1 = require("../common/middleware/jwt.guard");
let TwoFactorModule = class TwoFactorModule {
};
exports.TwoFactorModule = TwoFactorModule;
exports.TwoFactorModule = TwoFactorModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, two_factor_setting_entity_1.TwoFactorSetting, two_factor_backup_code_entity_1.TwoFactorBackupCode]),
            config_1.ConfigModule,
            // 添加 JwtModule，以便 JwtService 可以被注入
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '1h')
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [twofactor_controller_1.TwoFactorController],
        providers: [
            twofactor_service_1.TwoFactorService,
            jwt_guard_1.JwtGuard, // 确保 JwtGuard 在 providers 中
        ],
        exports: [twofactor_service_1.TwoFactorService],
    })
], TwoFactorModule);
//# sourceMappingURL=twofactor.module.js.map