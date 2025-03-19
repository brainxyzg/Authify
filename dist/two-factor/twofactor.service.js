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
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const two_factor_setting_entity_1 = require("../common/entities/two-factor-setting.entity");
const user_entity_1 = require("../common/entities/user.entity");
const two_factor_backup_code_entity_1 = require("../common/entities/two-factor-backup-code.entity");
const otplib_1 = require("otplib");
const qrcode_1 = require("qrcode");
const bcrypt = __importStar(require("bcrypt"));
let TwoFactorService = class TwoFactorService {
    userRepository;
    twoFactorRepository;
    backupCodeRepository;
    constructor(userRepository, twoFactorRepository, backupCodeRepository) {
        this.userRepository = userRepository;
        this.twoFactorRepository = twoFactorRepository;
        this.backupCodeRepository = backupCodeRepository;
        otplib_1.authenticator.options = { step: 30, window: 1 }; // 30 秒周期，允许前后 1 个周期误差
    }
    async enable2FA(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return {
                status: 'error',
                data: null,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            };
        }
        if (user.twoFactorSetting?.isEnabled) {
            return {
                status: 'error',
                data: null,
                message: '2FA already enabled',
                code: '2FA_ALREADY_ENABLED',
            };
        }
        const secret = otplib_1.authenticator.generateSecret(); // 生成 TOTP 密钥
        const otpauthUrl = otplib_1.authenticator.keyuri(user.username, 'Authify', secret); // 生成 otpauth URL
        const qrCodeUrl = await (0, qrcode_1.toDataURL)(otpauthUrl); // 生成二维码
        // 修改这里：使用 generateBackupCodesInternal 而不是 generateBackupCodes
        const backupCodes = this.generateBackupCodesInternal(2);
        let twoFactorSetting = await this.twoFactorRepository.findOne({
            where: { user: { id: userId } }
        });
        if (!twoFactorSetting) {
            twoFactorSetting = this.twoFactorRepository.create({
                user,
                secret,
                isEnabled: false,
            });
        }
        else {
            twoFactorSetting.secret = secret;
            twoFactorSetting.isEnabled = false;
            twoFactorSetting.enabledAt = undefined;
        }
        await this.twoFactorRepository.save(twoFactorSetting);
        await this.saveBackupCodes(user, backupCodes);
        return {
            status: 'success',
            data: { secret, qr_code_url: qrCodeUrl, backup_codes: backupCodes },
            message: '2FA setup initiated, please verify the code',
            code: 'SUCCESS_2FA_INIT',
        };
    }
    async verify2FA(userId, verifyDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['twoFactorSetting'],
        });
        if (!user || !user.twoFactorSetting) {
            return {
                status: 'error',
                data: null,
                message: '2FA not initiated',
                code: '2FA_NOT_INITIATED',
            };
        }
        const isValid = otplib_1.authenticator.verify({ token: verifyDto.code, secret: user.twoFactorSetting.secret });
        if (!isValid) {
            return {
                status: 'error',
                data: { two_factor_enabled: false },
                message: 'Verification failed',
                code: 'INVALID_2FA_CODE',
            };
        }
        user.twoFactorSetting.isEnabled = true;
        await this.twoFactorRepository.save(user.twoFactorSetting);
        return {
            status: 'success',
            data: { two_factor_enabled: true },
            message: '2FA activated successfully',
            code: 'SUCCESS_VERIFY_2FA',
        };
    }
    async disable2FA(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['twoFactorSetting'],
        });
        if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
            return {
                status: 'error',
                data: null,
                message: '2FA not enabled',
                code: '2FA_NOT_ENABLED',
            };
        }
        await this.twoFactorRepository.update({ userId: user.twoFactorSetting.userId }, { isEnabled: false });
        await this.backupCodeRepository.delete({ user: { id: userId } });
        return {
            status: 'success',
            data: null,
            message: '2FA disabled successfully',
            code: 'SUCCESS_DISABLE_2FA',
        };
    }
    async generateBackupCodes(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['twoFactorSetting'],
        });
        if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
            return {
                status: 'error',
                data: null,
                message: '2FA not enabled',
                code: '2FA_NOT_ENABLED',
            };
        }
        // 修改这里：使用 generateBackupCodesInternal 而不是 generateBackupCodes1
        const backupCodes = this.generateBackupCodesInternal(2);
        await this.backupCodeRepository.delete({ user: { id: userId } });
        await this.saveBackupCodes(user, backupCodes);
        return {
            status: 'success',
            data: { backup_codes: backupCodes },
            message: 'Backup codes generated successfully',
            code: 'SUCCESS_GENERATE_BACKUP_CODES',
        };
    }
    // 重命名方法：generateBackupCodes1 -> generateBackupCodesInternal
    generateBackupCodesInternal(count) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(Math.random().toString().slice(2, 10)); // 8位随机数字
        }
        return codes;
    }
    async saveBackupCodes(user, codes) {
        const hashedCodes = await Promise.all(codes.map(code => bcrypt.hash(code, 10)));
        const backupCodeEntities = hashedCodes.map(hash => this.backupCodeRepository.create({ user, codeHash: hash }));
        await this.backupCodeRepository.save(backupCodeEntities);
    }
    // 用于登录验证的公共方法
    async validate2FACode(userId, code) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['twoFactorSetting', 'twoFactorBackupCodes'],
        });
        if (!user || !user.twoFactorSetting || !user.twoFactorSetting.isEnabled) {
            return false;
        }
        const isTOTPValid = otplib_1.authenticator.verify({ token: code, secret: user.twoFactorSetting.secret });
        if (isTOTPValid)
            return true;
        const backupCode = user.twoFactorBackupCodes.find(async (bc) => await bcrypt.compare(code, bc.codeHash));
        if (backupCode) {
            await this.backupCodeRepository.delete({ id: backupCode.id });
            return true;
        }
        return false;
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(two_factor_setting_entity_1.TwoFactorSetting)),
    __param(2, (0, typeorm_1.InjectRepository)(two_factor_backup_code_entity_1.TwoFactorBackupCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TwoFactorService);
//# sourceMappingURL=twofactor.service.js.map