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
exports.Enable2FAResponseDto = exports.Enable2FADto = void 0;
const class_validator_1 = require("class-validator");
class Enable2FADto {
    code; // 用户输入的 TOTP 验证码
}
exports.Enable2FADto = Enable2FADto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], Enable2FADto.prototype, "code", void 0);
class Enable2FAResponseDto {
    secret; // 返回给用户用于配置验证器的密钥
    qrCodeUrl; // 用于扫描的二维码 URL
}
exports.Enable2FAResponseDto = Enable2FAResponseDto;
//# sourceMappingURL=enable-2fa.dto.js.map