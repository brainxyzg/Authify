"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let ErrorHandlingInterceptor = class ErrorHandlingInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.catchError)((err) => {
            const status = err instanceof common_1.HttpException ? err.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const response = {
                status: 'error',
                data: null,
                message: err.message || 'Internal server error',
                code: err.code || 'INTERNAL_SERVER_ERROR',
            };
            return (0, rxjs_1.throwError)(() => new common_1.HttpException(response, status));
        }));
    }
};
exports.ErrorHandlingInterceptor = ErrorHandlingInterceptor;
exports.ErrorHandlingInterceptor = ErrorHandlingInterceptor = __decorate([
    (0, common_1.Injectable)()
], ErrorHandlingInterceptor);
//# sourceMappingURL=error-handling.interceptor.js.map