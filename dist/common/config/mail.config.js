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
exports.default = (0, config_1.registerAs)('mail', () => ({
    host: toString(process.env.MAIL_HOST, 'smtp.example.com'),
    port: toNumber(process.env.MAIL_PORT, 587),
    secure: toString(process.env.MAIL_SECURE, 'false') === 'true', // 是否使用 SSL/TLS
    auth: {
        user: toString(process.env.MAIL_USER, 'your_email@example.com'),
        pass: toString(process.env.MAIL_PASSWORD, 'your_email_password'),
    },
    from: toString(process.env.MAIL_FROM, '"Authify" <no-reply@example.com>'),
}));
//# sourceMappingURL=mail.config.js.map