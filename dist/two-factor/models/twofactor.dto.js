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
exports.GenerateBackupCodesResponseDto = exports.Verify2FAResponseDto = exports.Verify2FADto = exports.Enable2FAResponseDto = void 0;
const class_validator_1 = require("class-validator");
// 启用 2FA 响应
class Enable2FAResponseDto {
    secret;
    qr_code_url;
    backup_codes;
}
exports.Enable2FAResponseDto = Enable2FAResponseDto;
// 验证 2FA 请求
class Verify2FADto {
    code;
}
exports.Verify2FADto = Verify2FADto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], Verify2FADto.prototype, "code", void 0);
// 验证 2FA 响应
class Verify2FAResponseDto {
    two_factor_enabled;
}
exports.Verify2FAResponseDto = Verify2FAResponseDto;
// 生成备份码响应
class GenerateBackupCodesResponseDto {
    backup_codes;
}
exports.GenerateBackupCodesResponseDto = GenerateBackupCodesResponseDto;
//# sourceMappingURL=twofactor.dto.js.map