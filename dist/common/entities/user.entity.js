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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const user_role_entity_1 = require("./user-role.entity");
const refresh_token_entity_1 = require("./refresh-token.entity");
const blacklisted_token_entity_1 = require("./blacklisted-token.entity");
const two_factor_setting_entity_1 = require("./two-factor-setting.entity");
const two_factor_backup_code_entity_1 = require("./two-factor-backup-code.entity");
const email_verification_entity_1 = require("./email-verification.entity");
const password_reset_entity_1 = require("./password-reset.entity");
const login_method_entity_1 = require("./login-method.entity");
let User = class User {
    id;
    email;
    username;
    passwordHash;
    isActive;
    emailVerified;
    createdAt;
    updatedAt;
    userRoles;
    refreshTokens;
    blacklistedTokens;
    twoFactorSetting;
    twoFactorBackupCodes;
    emailVerifications;
    passwordResets;
    loginMethods;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true, nullable: false }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true, nullable: false }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 60, nullable: false }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, nullable: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, nullable: false }),
    __metadata("design:type", Boolean)
], User.prototype, "emailVerified", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_role_entity_1.UserRole, (userRole) => userRole.user),
    __metadata("design:type", Array)
], User.prototype, "userRoles", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refresh_token_entity_1.RefreshToken, (refreshToken) => refreshToken.user),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => blacklisted_token_entity_1.BlacklistedToken, (blacklistedToken) => blacklistedToken.user),
    __metadata("design:type", Array)
], User.prototype, "blacklistedTokens", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => two_factor_setting_entity_1.TwoFactorSetting, (twoFactorSetting) => twoFactorSetting.user),
    __metadata("design:type", two_factor_setting_entity_1.TwoFactorSetting)
], User.prototype, "twoFactorSetting", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => two_factor_backup_code_entity_1.TwoFactorBackupCode, (backupCode) => backupCode.user),
    __metadata("design:type", Array)
], User.prototype, "twoFactorBackupCodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => email_verification_entity_1.EmailVerification, (emailVerification) => emailVerification.user),
    __metadata("design:type", Array)
], User.prototype, "emailVerifications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => password_reset_entity_1.PasswordReset, (passwordReset) => passwordReset.user),
    __metadata("design:type", Array)
], User.prototype, "passwordResets", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => login_method_entity_1.LoginMethod, (loginMethod) => loginMethod.user),
    __metadata("design:type", Array)
], User.prototype, "loginMethods", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('Users')
], User);
//# sourceMappingURL=user.entity.js.map