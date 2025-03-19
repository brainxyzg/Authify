import { registerAs } from '@nestjs/config';

// 辅助函数：将环境变量转换为数字并提供默认值
const toNumber = (value: string | undefined, defaultValue: number): number => {
  return value !== undefined && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : defaultValue;
};

// 辅助函数：确保字符串非 undefined
const toString = (value: string | undefined, defaultValue: string): string => {
  return value !== undefined ? value : defaultValue;
};

export default registerAs('mail', () => ({
  host: toString(process.env.MAIL_HOST, 'smtp.example.com'),
  port: toNumber(process.env.MAIL_PORT, 587),
  secure: toString(process.env.MAIL_SECURE, 'false') === 'true', // 是否使用 SSL/TLS
  auth: {
    user: toString(process.env.MAIL_USER, 'your_email@example.com'),
    pass: toString(process.env.MAIL_PASSWORD, 'your_email_password'),
  },
  from: toString(process.env.MAIL_FROM, '"Authify" <no-reply@example.com>'),
}));
