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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const users_dto_1 = require("./models/users.dto");
const jwt_guard_1 = require("../common/middleware/jwt.guard");
const rate_limiting_guard_1 = require("../common/middleware/rate-limiting.guard");
const throttle_decorator_1 = require("../common/decorators/throttle.decorator");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getCurrentUser(req) {
        const result = await this.usersService.getCurrentUser(req.user.sub);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async updateUserInfo(req, updateDto) {
        const result = await this.usersService.updateUserInfo(req.user.sub, updateDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, result.data ? common_1.HttpStatus.BAD_REQUEST : common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async changePassword(req, changePasswordDto) {
        const result = await this.usersService.changePassword(req.user.sub, changePasswordDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async sendVerifyEmail(req) {
        const result = await this.usersService.sendVerifyEmail(req.user.sub);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
    async verifyEmail(req, verifyDto) {
        const result = await this.usersService.verifyEmail(req.user.sub, verifyDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, result.data ? common_1.HttpStatus.BAD_REQUEST : common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(60 * 60, 5) // 5 次/小时
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, users_dto_1.UpdateUserInfoDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUserInfo", null);
__decorate([
    (0, common_1.Patch)('me/password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(60 * 60, 5) // 5 次/小时
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, users_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('me/verify-email/send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(24 * 60 * 60, 3) // 3 次/天
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "sendVerifyEmail", null);
__decorate([
    (0, common_1.Patch)('me/verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(60 * 60, 10) // 10 次/小时
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, users_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "verifyEmail", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map