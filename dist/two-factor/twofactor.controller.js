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
exports.TwoFactorController = void 0;
const common_1 = require("@nestjs/common");
const twofactor_service_1 = require("./twofactor.service");
const twofactor_dto_1 = require("./models/twofactor.dto");
const jwt_guard_1 = require("../common/middleware/jwt.guard");
const rate_limiting_guard_1 = require("../common/middleware/rate-limiting.guard");
const throttle_decorator_1 = require("../common/decorators/throttle.decorator");
let TwoFactorController = class TwoFactorController {
    twoFactorService;
    constructor(twoFactorService) {
        this.twoFactorService = twoFactorService;
    }
    async enable2FA(req) {
        const result = await this.twoFactorService.enable2FA(req.user.sub);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
    async verify2FA(req, verifyDto) {
        const result = await this.twoFactorService.verify2FA(req.user.sub, verifyDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, result.data ? common_1.HttpStatus.BAD_REQUEST : common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async disable2FA(req) {
        const result = await this.twoFactorService.disable2FA(req.user.sub);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
    async generateBackupCodes(req) {
        const result = await this.twoFactorService.generateBackupCodes(req.user.sub);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
};
exports.TwoFactorController = TwoFactorController;
__decorate([
    (0, common_1.Post)('enable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(24 * 60 * 60, 3) // 3 次/天
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "enable2FA", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(60 * 60, 10) // 10 次/小时
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, twofactor_dto_1.Verify2FADto]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "verify2FA", null);
__decorate([
    (0, common_1.Post)('disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(24 * 60 * 60, 3) // 3 次/天
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "disable2FA", null);
__decorate([
    (0, common_1.Post)('backup-codes/generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(24 * 60 * 60, 3) // 3 次/天
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TwoFactorController.prototype, "generateBackupCodes", null);
exports.TwoFactorController = TwoFactorController = __decorate([
    (0, common_1.Controller)('2fa'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:paramtypes", [twofactor_service_1.TwoFactorService])
], TwoFactorController);
//# sourceMappingURL=twofactor.controller.js.map