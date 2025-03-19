"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentTypeMiddleware = void 0;
const common_1 = require("@nestjs/common");
let ContentTypeMiddleware = class ContentTypeMiddleware {
    use(req, res, next) {
        const methods = ['POST', 'PATCH'];
        if (methods.includes(req.method)) {
            const contentType = req.get('Content-Type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new common_1.HttpException('Unsupported Media Type', common_1.HttpStatus.UNSUPPORTED_MEDIA_TYPE);
            }
        }
        res.setHeader('Content-Type', 'application/json');
        next();
    }
};
exports.ContentTypeMiddleware = ContentTypeMiddleware;
exports.ContentTypeMiddleware = ContentTypeMiddleware = __decorate([
    (0, common_1.Injectable)()
], ContentTypeMiddleware);
//# sourceMappingURL=content-type.middleware.js.map