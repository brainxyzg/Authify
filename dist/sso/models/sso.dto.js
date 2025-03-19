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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsoCallbackResponseDto = exports.SsoCallbackDto = exports.InitiateSsoDto = exports.SsoProvider = void 0;
const class_validator_1 = require("class-validator");
// SSO 提供商枚举
var SsoProvider;
(function (SsoProvider) {
    SsoProvider["GOOGLE"] = "google";
    SsoProvider["GITHUB"] = "github";
})(SsoProvider || (exports.SsoProvider = SsoProvider = {}));
// 发起 SSO 请求路径参数
class InitiateSsoDto {
    provider;
}
exports.InitiateSsoDto = InitiateSsoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(5, 20),
    (0, class_validator_1.IsEnum)(SsoProvider),
    __metadata("design:type", String)
], InitiateSsoDto.prototype, "provider", void 0);
// SSO 回调查询参数
class SsoCallbackDto {
    code;
    state;
}
exports.SsoCallbackDto = SsoCallbackDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(10, 255),
    __metadata("design:type", String)
], SsoCallbackDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(32, 128),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SsoCallbackDto.prototype, "state", void 0);
// SSO 回调响应
class SsoCallbackResponseDto {
    access_token;
    token_type;
    refresh_token;
    expires_in;
    user;
}
exports.SsoCallbackResponseDto = SsoCallbackResponseDto;
//# sourceMappingURL=sso.dto.js.map