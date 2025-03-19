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
exports.EmailVerification = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let EmailVerification = class EmailVerification {
    id;
    userId;
    token;
    requestedAt;
    expiresAt;
    isUsed;
    user;
};
exports.EmailVerification = EmailVerification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], EmailVerification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: false }),
    __metadata("design:type", Number)
], EmailVerification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, unique: true, nullable: false }),
    __metadata("design:type", String)
], EmailVerification.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], EmailVerification.prototype, "requestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], EmailVerification.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, nullable: false }),
    __metadata("design:type", Boolean)
], EmailVerification.prototype, "isUsed", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.emailVerifications, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], EmailVerification.prototype, "user", void 0);
exports.EmailVerification = EmailVerification = __decorate([
    (0, typeorm_1.Entity)('Email_Verifications')
], EmailVerification);
//# sourceMappingURL=email-verification.entity.js.map