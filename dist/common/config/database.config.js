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
// 辅助函数：将环境变量转换为布尔值
const toBoolean = (value, defaultValue) => {
    return value !== undefined ? value === 'true' : defaultValue;
};
exports.default = (0, config_1.registerAs)('database', () => ({
    type: 'postgres', // 确保类型为 'postgres'
    host: toString(process.env.DB_HOST, 'localhost'),
    port: toNumber(process.env.DB_PORT, 5432),
    username: toString(process.env.DB_USERNAME, 'postgres'),
    password: toString(process.env.DB_PASSWORD, 'postgres'),
    database: toString(process.env.DB_DATABASE, 'authify_db'),
    entities: ['dist/**/*.entity{.ts,.js}'], // 编译后的实体路径
    synchronize: toBoolean(process.env.DB_SYNCHRONIZE, process.env.NODE_ENV !== 'production'),
    logging: toBoolean(process.env.DB_LOGGING, process.env.NODE_ENV !== 'production'),
}));
//# sourceMappingURL=database.config.js.map