"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Throttle = exports.THROTTLE_METADATA_KEY = void 0;
// src/common/decorators/throttle.decorator.ts
const common_1 = require("@nestjs/common");
// 定义元数据的键名
exports.THROTTLE_METADATA_KEY = 'throttle';
// Throttle 装饰器，接受 ttl 和 limit 参数
const Throttle = (ttl, limit) => (0, common_1.SetMetadata)(exports.THROTTLE_METADATA_KEY, { ttl, limit });
exports.Throttle = Throttle;
//# sourceMappingURL=throttle.decorator.js.map