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
exports.SsoController = void 0;
const common_1 = require("@nestjs/common");
const sso_service_1 = require("./sso.service");
const sso_dto_1 = require("./models/sso.dto");
const rate_limiting_guard_1 = require("../common/middleware/rate-limiting.guard");
const throttle_decorator_1 = require("../common/decorators/throttle.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let SsoController = class SsoController {
    ssoService;
    constructor(ssoService) {
        this.ssoService = ssoService;
    }
    async initiateSso(params, res) {
        const authUrl = await this.ssoService.initiateSso(params.provider);
        res.redirect(common_1.HttpStatus.FOUND, authUrl);
    }
    async handleSsoCallback(params, query, res) {
        const result = await this.ssoService.handleSsoCallback(params.provider, query.code, query.state);
        if (result.status === 'error') {
            throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
        }
        res.status(common_1.HttpStatus.OK).json(result);
    }
};
exports.SsoController = SsoController;
__decorate([
    (0, common_1.Get)(':provider'),
    (0, throttle_decorator_1.Throttle)(60, 10) // 10 次/分钟
    ,
    (0, public_decorator_1.Public)() // 无需认证
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sso_dto_1.InitiateSsoDto, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "initiateSso", null);
__decorate([
    (0, common_1.Get)(':provider/callback'),
    (0, throttle_decorator_1.Throttle)(60, 10) // 10 次/分钟
    ,
    (0, common_1.UseGuards)(rate_limiting_guard_1.RateLimitingGuard),
    (0, public_decorator_1.Public)() // 无需认证
    ,
    __param(0, (0, common_1.Param)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sso_dto_1.InitiateSsoDto,
        sso_dto_1.SsoCallbackDto, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "handleSsoCallback", null);
exports.SsoController = SsoController = __decorate([
    (0, common_1.Controller)('sso'),
    __metadata("design:paramtypes", [sso_service_1.SsoService])
], SsoController);
//# sourceMappingURL=sso.controller.js.map