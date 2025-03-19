"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
// 辅助函数：确保字符串非 undefined
const toString = (value, defaultValue) => {
    return value !== undefined ? value : defaultValue;
};
exports.default = (0, config_1.registerAs)('jwt', () => ({
    secret: toString(process.env.JWT_SECRET, 'your-secret-key'),
    accessTokenExpiration: toString(process.env.JWT_ACCESS_EXPIRATION, '15m'), // 访问令牌过期时间，默认 15 分钟
    refreshTokenExpiration: toString(process.env.JWT_REFRESH_EXPIRATION, '7d'), // 刷新令牌过期时间，默认 7 天
}));
//# sourceMappingURL=jwt.config.js.map