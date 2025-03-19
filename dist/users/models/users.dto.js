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
exports.VerifyEmailResponseDto = exports.VerifyEmailDto = exports.ChangePasswordDto = exports.UpdateUserInfoResponseDto = exports.UpdateUserInfoDto = exports.UserInfoResponseDto = void 0;
const class_validator_1 = require("class-validator");
// 获取当前用户信息响应
class UserInfoResponseDto {
    user_id;
    username;
    email;
    roles;
    is_email_verified;
    two_factor_enabled;
}
exports.UserInfoResponseDto = UserInfoResponseDto;
// 更新用户信息请求
class UpdateUserInfoDto {
    username;
}
exports.UpdateUserInfoDto = UpdateUserInfoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 50),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserInfoDto.prototype, "username", void 0);
// 更新用户信息响应
class UpdateUserInfoResponseDto {
    username;
}
exports.UpdateUserInfoResponseDto = UpdateUserInfoResponseDto;
// 修改密码请求
class ChangePasswordDto {
    old_password;
    new_password;
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 128),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "old_password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 128),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "new_password", void 0);
// 验证邮箱请求
class VerifyEmailDto {
    code;
}
exports.VerifyEmailDto = VerifyEmailDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9]{6}$/),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifyEmailDto.prototype, "code", void 0);
// 验证邮箱响应
class VerifyEmailResponseDto {
    is_email_verified;
}
exports.VerifyEmailResponseDto = VerifyEmailResponseDto;
//# sourceMappingURL=users.dto.js.map