import { registerAs } from '@nestjs/config';
import { AppConfig } from './config.types';
import { parseNumber, parseString } from '../common/utils/config-utils';

// 配置命名空间
export default registerAs(
  'app',
  () =>
    ({
      port: parseNumber(process.env.PORT, 3000),
      env: parseString(process.env.NODE_ENV, 'development', ['development', 'production', 'test']),
      logLevel: parseString(process.env.LOG_LEVEL, 'info', ['error', 'warn', 'info', 'debug']),
    }) as AppConfig,
);
