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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./models/login.dto");
const refresh_token_dto_1 = require("./models/refresh-token.dto");
const rate_limiting_guard_1 = require("../common/middleware/rate-limiting.guard");
const jwt_guard_1 = require("../common/middleware/jwt.guard");
const throttle_decorator_1 = require("../common/decorators/throttle.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        const result = await this.authService.login(loginDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async refreshToken(refreshTokenDto) {
        const result = await this.authService.refreshToken(refreshTokenDto);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
    async logout(req) {
        const token = req.headers.authorization?.split(' ')[1];
        const result = await this.authService.logout(token);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.UNAUTHORIZED);
        }
        return result;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(15 * 60, 5) // 5 次/15分钟
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('token/refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttle_decorator_1.Throttle)(60 * 60, 20) // 20 次/小时
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map