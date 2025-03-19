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
exports.LoginMethod = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let LoginMethod = class LoginMethod {
    id;
    userId;
    provider;
    providerUserId;
    createdAt;
    user;
};
exports.LoginMethod = LoginMethod;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], LoginMethod.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: false }),
    __metadata("design:type", Number)
], LoginMethod.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: false, enum: ['google', 'github'] }),
    __metadata("design:type", String)
], LoginMethod.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], LoginMethod.prototype, "providerUserId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], LoginMethod.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.loginMethods, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], LoginMethod.prototype, "user", void 0);
exports.LoginMethod = LoginMethod = __decorate([
    (0, typeorm_1.Entity)('Login_Methods'),
    (0, typeorm_1.Unique)(['provider', 'providerUserId'])
], LoginMethod);
//# sourceMappingURL=login-method.entity.js.map