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
exports.BlacklistedToken = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let BlacklistedToken = class BlacklistedToken {
    id;
    userId;
    tokenIdentifier;
    tokenType;
    blacklistedAt;
    expiresAt;
    user;
};
exports.BlacklistedToken = BlacklistedToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], BlacklistedToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: false }),
    __metadata("design:type", Number)
], BlacklistedToken.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128, nullable: false }),
    __metadata("design:type", String)
], BlacklistedToken.prototype, "tokenIdentifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: false, enum: ['access', 'refresh'] }),
    __metadata("design:type", String)
], BlacklistedToken.prototype, "tokenType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], BlacklistedToken.prototype, "blacklistedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], BlacklistedToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.blacklistedTokens, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], BlacklistedToken.prototype, "user", void 0);
exports.BlacklistedToken = BlacklistedToken = __decorate([
    (0, typeorm_1.Entity)('Blacklisted_Tokens')
], BlacklistedToken);
//# sourceMappingURL=blacklisted-token.entity.js.map