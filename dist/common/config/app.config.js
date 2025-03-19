"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
// 辅助函数：将环境变量转换为数字并提供默认值
const toNumber = (value, defaultValue) => {
    return value !== undefined && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
};
// 辅助函数：确保字符串非 undefined
const toString = (value, defaultValue) => {
    return value !== undefined ? value : defaultValue;
};
exports.default = (0, config_1.registerAs)('app', () => ({
    port: toNumber(process.env.PORT, 3000),
    env: toString(process.env.NODE_ENV, 'development'),
    logLevel: toString(process.env.LOG_LEVEL, 'info'),
}));
//# sourceMappingURL=app.config.js.map