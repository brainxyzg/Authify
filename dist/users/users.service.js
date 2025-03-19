"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../common/entities/user.entity");
const email_verification_entity_1 = require("../common/entities/email-verification.entity");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
let UsersService = class UsersService {
    userRepository;
    emailVerificationRepository;
    constructor(userRepository, emailVerificationRepository) {
        this.userRepository = userRepository;
        this.emailVerificationRepository = emailVerificationRepository;
    }
    async getCurrentUser(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['roles', 'twoFactorSetting'],
        });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        return {
            status: 'success',
            data: {
                user_id: user.id.toString(),
                username: user.username,
                email: user.email,
                roles: user.userRoles.map(role => role.role.name),
                is_email_verified: user.emailVerified,
                two_factor_enabled: !!user.twoFactorSetting?.isEnabled,
            },
            message: 'User info retrieved successfully',
            code: 'SUCCESS_GET_USER_INFO',
        };
    }
    async updateUserInfo(userId, updateDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        if (updateDto.username) {
            const existingUser = await this.userRepository.findOne({ where: { username: updateDto.username } });
            if (existingUser && existingUser.id !== userId) {
                return {
                    status: 'error',
                    data: { username: user.username },
                    message: 'Update failed',
                    code: 'USERNAME_TAKEN',
                };
            }
            user.username = updateDto.username;
        }
        await this.userRepository.save(user);
        return {
            status: 'success',
            data: { username: user.username },
            message: 'User info updated successfully',
            code: 'SUCCESS_UPDATE_USER_INFO',
        };
    }
    async changePassword(userId, changePasswordDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        const isOldPasswordValid = await bcrypt.compare(changePasswordDto.old_password, user.passwordHash);
        if (!isOldPasswordValid) {
            return {
                status: 'error',
                data: null,
                message: 'Incorrect old password',
                code: 'INCORRECT_PASSWORD',
            };
        }
        const newPasswordHash = await bcrypt.hash(changePasswordDto.new_password, 10);
        user.passwordHash = newPasswordHash;
        await this.userRepository.save(user);
        return {
            status: 'success',
            data: null,
            message: 'Password updated successfully',
            code: 'SUCCESS_UPDATE_PASSWORD',
        };
    }
    async sendVerifyEmail(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        if (user.emailVerified) {
            return {
                status: 'error',
                data: null,
                message: 'Email already verified',
                code: 'EMAIL_ALREADY_VERIFIED',
            };
        }
        // 修改这部分代码
        const code = (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase(); // 6 字符验证码
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时有效期
        // 创建一个符合 EmailVerification 实体结构的对象
        const verification = new email_verification_entity_1.EmailVerification();
        verification.user = user;
        verification.token = code;
        verification.expiresAt = expiresAt;
        await this.emailVerificationRepository.save(verification);
        // TODO: 发送邮件逻辑（集成邮件服务）
        console.log(`Verification code for ${user.email}: ${code}`);
        return {
            status: 'success',
            data: null,
            message: 'Verification email sent',
            code: 'SUCCESS_SEND_VERIFY_EMAIL',
        };
    }
    async verifyEmail(userId, verifyDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        const verification = await this.emailVerificationRepository.findOne({
            where: { user: { id: userId }, token: verifyDto.code },
        });
        if (!verification || verification.expiresAt < new Date()) {
            return {
                status: 'error',
                data: { is_email_verified: false },
                message: 'Verification failed',
                code: 'INVALID_CODE',
            };
        }
        user.emailVerified = true;
        await this.userRepository.save(user);
        await this.emailVerificationRepository.delete({ id: verification.id });
        return {
            status: 'success',
            data: { is_email_verified: true },
            message: 'Email verified successfully',
            code: 'SUCCESS_VERIFY_EMAIL',
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(email_verification_entity_1.EmailVerification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map