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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const public_service_1 = require("./public.service");
const register_dto_1 = require("./models/register.dto");
const forgot_password_dto_1 = require("./models/forgot-password.dto");
const reset_password_dto_1 = require("./models/reset-password.dto");
const rate_limiting_guard_1 = require("../common/middleware/rate-limiting.guard");
const throttle_decorator_1 = require("../common/decorators/throttle.decorator");
let PublicController = class PublicController {
    publicService;
    constructor(publicService) {
        this.publicService = publicService;
    }
    async register(registerDto) {
        const result = await this.publicService.register(registerDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
    async forgotPassword(forgotPasswordDto) {
        return this.publicService.forgotPassword(forgotPasswordDto);
    }
    async resetPassword(resetPasswordDto) {
        const result = await this.publicService.resetPassword(resetPasswordDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttle_decorator_1.Throttle)(60, 10),
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "resetPassword", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [public_service_1.PublicService])
], PublicController);
//# sourceMappingURL=public.controller.js.map